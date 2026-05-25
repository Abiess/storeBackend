"""
Telegram MTProto Scraper Microservice
=====================================
Nutzt Telethon (MTProto) um Telegram-Channels als Nutzer-Account zu lesen.

Klare Trennung:
  MTProto (api_id + api_hash) = Lesen von Channels  (DIESES SERVICE)
  Bot Token                   = Benachrichtigungen   (TelegramBotService.java)

Endpoints:
  POST /auth/request-code   -> Sendet Code ans Telefon
  POST /auth/verify-code    -> Verifiziert Code, gibt session_string zurück
  POST /auth/check-session  -> Prüft ob Session gültig ist
  POST /channels/list       -> Listet abonnierte Channels
  POST /channels/history    -> Holt letzte Posts eines Channels
  DELETE /auth/session      -> Logout / Session löschen

Alle Endpoints brauchen: api_id, api_hash, session_string (außer request-code/verify-code)
Session wird STATELESS als StringSession übergeben (gespeichert im Java-Backend DB).
"""

import asyncio
import io
import logging
import os
import re
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from telethon import TelegramClient, events
from telethon.sessions import StringSession
from telethon.tl.types import (
    MessageMediaPhoto,
    MessageMediaDocument,
    Channel,
    Chat,
)
from telethon.errors import (
    SessionPasswordNeededError,
    PhoneCodeInvalidError,
    PhoneCodeExpiredError,
    FloodWaitError,
    PhoneNumberFloodError,
    PhoneNumberBannedError,
    PhoneNumberInvalidError,
    ApiIdInvalidError,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# In-Memory Auth-Client-Cache
# Hält den Telethon-Client zwischen request-code und verify-code am Leben.
# Schlüssel: "{api_id}:{phone}" → TelegramClient
# Ohne das verliert Telethon den MTProto-Handshake-State → "Code abgelaufen"
# ─────────────────────────────────────────────────────────────────────────────
_pending_auth: dict = {}   # key: "{api_id}:{phone}" → TelegramClient

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class RequestCodeRequest(BaseModel):
    api_id: int
    api_hash: str
    phone: str

class RequestCodeResponse(BaseModel):
    phone_code_hash: str
    auth_session_string: Optional[str] = None  # Kann leer sein – Optional!
    message: str

class VerifyCodeRequest(BaseModel):
    api_id: int
    api_hash: str
    phone: str
    code: str
    phone_code_hash: str
    auth_session_string: Optional[str] = None  # Teil-Session aus request-code
    password: Optional[str] = None   # 2FA-Passwort falls aktiv

class VerifyCodeResponse(BaseModel):
    session_string: str
    phone: str
    message: str

class CheckSessionRequest(BaseModel):
    api_id: int
    api_hash: str
    session_string: str

class CheckSessionResponse(BaseModel):
    valid: bool
    phone: Optional[str] = None
    username: Optional[str] = None

class ChannelListRequest(BaseModel):
    api_id: int
    api_hash: str
    session_string: str

class ChannelInfo(BaseModel):
    id: int
    title: str
    username: Optional[str] = None
    members_count: Optional[int] = None

class ChannelListResponse(BaseModel):
    channels: List[ChannelInfo]

class ChannelHistoryRequest(BaseModel):
    api_id: int
    api_hash: str
    session_string: str
    channel: str           # @username oder numerische ID
    limit: int = 50
    min_id: int = 0        # Nur Posts nach diesem Message-ID (für Delta-Import)

class TelegramPost(BaseModel):
    message_id: int
    text: str
    photo_urls: List[str]   # Base64-kodierte Bilder
    photo_bytes_list: List[str]  # Base64 der Bild-Bytes
    date: str
    from_channel: str
    has_media: bool

class ChannelHistoryResponse(BaseModel):
    posts: List[TelegramPost]
    channel: str

class LogoutRequest(BaseModel):
    api_id: int
    api_hash: str
    session_string: str

# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Telegram MTProto Scraper gestartet")
    # ⚠️  WICHTIG: Der In-Memory-Auth-Cache (_pending_auth) funktioniert NUR bei einem Worker!
    #     Bei mehreren Workern (--workers 2+) trifft verify-code ggf. einen anderen Prozess
    #     als request-code → Cache leer → PHONE_CODE_EXPIRED.
    #     Lösung: Immer mit einem Worker starten (Standard in start.sh) ODER Redis verwenden.
    workers = os.environ.get("WEB_CONCURRENCY", "1")
    if workers != "1":
        logger.warning(
            f"⚠️  WEB_CONCURRENCY={workers} – Bei mehreren Workern kann PHONE_CODE_EXPIRED auftreten! "
            "Bitte auf 1 Worker reduzieren oder Redis-Cache einbauen."
        )
    yield
    # Beim Shutdown alle offenen Auth-Clients trennen
    for key, client in list(_pending_auth.items()):
        try:
            await client.disconnect()
        except Exception:
            pass
    _pending_auth.clear()
    logger.info("✅ Telegram Scraper beendet")

app = FastAPI(
    title="Telegram MTProto Scraper",
    description="Liest Telegram-Channels via MTProto API (Telethon). Für markt.ma Store-Importer.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Helper: Client erstellen
# ─────────────────────────────────────────────────────────────────────────────

def make_client(api_id: int, api_hash: str, session_string: Optional[str] = None) -> TelegramClient:
    session = StringSession(session_string) if session_string else StringSession()
    return TelegramClient(
        session,
        api_id,
        api_hash,
        device_model="markt.ma Store Importer",
        system_version="1.0",
        app_version="1.0",
    )

async def _safe_disconnect(client: TelegramClient) -> None:
    """Trennt Client ohne Exception zu werfen. Max. 3 Sekunden Timeout."""
    try:
        if client and client.is_connected():
            await asyncio.wait_for(client.disconnect(), timeout=3.0)
    except asyncio.TimeoutError:
        logger.warning("[Auth] safe_disconnect: Timeout nach 3s – Client wird aufgegeben")
    except Exception as e:
        logger.warning(f"[Auth] safe_disconnect: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Auth Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/request-code", response_model=RequestCodeResponse)
async def request_code(req: RequestCodeRequest):
    """
    Schritt 1: Code ans Telefon senden.
    Der Client bleibt im RAM bis verify-code aufgerufen wird.
    """
    cache_key = f"{req.api_id}:{req.phone}"
    logger.info(f"[Auth] Sende Code an {req.phone} (key={cache_key})")

    # Alten Client aufräumen falls vorhanden (mit Timeout – kann sonst hängen!)
    old_client: TelegramClient = _pending_auth.pop(cache_key, None)
    if old_client:
        try:
            await asyncio.wait_for(old_client.disconnect(), timeout=3.0)
            logger.info(f"[Auth] Alter Client getrennt (key={cache_key})")
        except asyncio.TimeoutError:
            logger.warning(f"[Auth] Alter Client Disconnect-Timeout – wird aufgegeben (key={cache_key})")
        except Exception as cleanup_err:
            logger.warning(f"[Auth] Cleanup alter Client fehlgeschlagen (wird ignoriert): {cleanup_err}")

    client = make_client(req.api_id, req.api_hash)

    try:
        await asyncio.wait_for(client.connect(), timeout=10.0)
        result = await asyncio.wait_for(client.send_code_request(req.phone), timeout=15.0)

        # Client VERBUNDEN lassen – verify-code braucht denselben Client!
        _pending_auth[cache_key] = client

        # Teil-Session als Fallback speichern (optional)
        try:
            auth_session_string = client.session.save() or None
        except Exception:
            auth_session_string = None

        logger.info(f"[Auth] ✅ Code gesendet, Client gecacht (key={cache_key})")
        return RequestCodeResponse(
            phone_code_hash=result.phone_code_hash,
            auth_session_string=auth_session_string,
            message=f"Code an {req.phone} gesendet"
        )
    except ApiIdInvalidError:
        await _safe_disconnect(client)
        raise HTTPException(400, "Ungültige API ID oder API Hash. Bitte auf my.telegram.org prüfen.")
    except PhoneNumberInvalidError:
        await _safe_disconnect(client)
        raise HTTPException(400, f"Ungültige Telefonnummer: {req.phone}. Format: +491234567890")
    except PhoneNumberBannedError:
        await _safe_disconnect(client)
        raise HTTPException(403, f"Telefonnummer {req.phone} ist bei Telegram gesperrt.")
    except PhoneNumberFloodError:
        await _safe_disconnect(client)
        raise HTTPException(429, "Zu viele Code-Anfragen für diese Nummer. Bitte morgen erneut versuchen.")
    except FloodWaitError as e:
        await _safe_disconnect(client)
        raise HTTPException(429, f"Zu viele Versuche. Bitte {e.seconds} Sekunden warten.")
    except asyncio.TimeoutError:
        await _safe_disconnect(client)
        raise HTTPException(504, "Timeout beim Verbinden mit Telegram – bitte erneut versuchen.")
    except Exception as e:
        logger.error(f"[Auth] request-code Fehler: {type(e).__name__}: {e}")
        await _safe_disconnect(client)
        raise HTTPException(400, f"Fehler beim Senden des Codes: {type(e).__name__}: {e}")


@app.post("/auth/verify-code", response_model=VerifyCodeResponse)
async def verify_code(req: VerifyCodeRequest):
    """
    Schritt 2: Code verifizieren → gibt session_string zurück.
    Verwendet den gecachten Client aus request-code (gleicher MTProto-State).
    """
    cache_key = f"{req.api_id}:{req.phone}"

    # ── E2E Diagnose-Logging ──────────────────────────────────────────────────
    has_session_str = bool(req.auth_session_string and req.auth_session_string.strip())
    has_phone_code_hash = bool(req.phone_code_hash and req.phone_code_hash.strip())
    session_len = len(req.auth_session_string) if has_session_str else 0
    hash_len = len(req.phone_code_hash) if has_phone_code_hash else 0
    hash_preview = req.phone_code_hash[:6] + "..." if has_phone_code_hash and hash_len > 6 else req.phone_code_hash
    session_preview = req.auth_session_string[:10] + "..." if has_session_str and session_len > 10 else req.auth_session_string

    logger.info(
        f"[Auth][E2E] verify-code eingetroffen: phone={req.phone} "
        f"has_auth_session_string={has_session_str} session_len={session_len} session_prefix=({session_preview}) "
        f"has_phone_code_hash={has_phone_code_hash} hash_len={hash_len} hash_prefix=({hash_preview}) "
        f"pending_cache_keys={list(_pending_auth.keys())}"
    )
    # ─────────────────────────────────────────────────────────────────────────

    logger.info(f"[Auth] Verifiziere Code für {req.phone} (key={cache_key})")

    # Gecachten Client holen (ODER Fallback: neue Session mit auth_session_string)
    client: TelegramClient = _pending_auth.pop(cache_key, None)

    if client is None:
        logger.warning(f"[Auth][E2E] ⚠️  FALLBACK-PFAD: Kein gecachter Client für key={cache_key} – versuche StringSession(auth_session_string)")
        # ⚠️  Häufigste Ursache: Service-Neustart, mehrere Worker oder Load-Balancer
        #     Der In-Memory-Cache (_pending_auth) war leer.
        if req.auth_session_string:
            logger.info(f"[Auth][E2E] Erstelle Client via StringSession(auth_session_string) len={len(req.auth_session_string)}")
            client = make_client(req.api_id, req.api_hash, req.auth_session_string)
            # KRITISCH: connect() MUSS vor sign_in() aufgerufen werden!
            try:
                await asyncio.wait_for(client.connect(), timeout=10.0)
                logger.info(f"[Auth][E2E] Fallback-Client verbunden: is_connected={client.is_connected()} (key={cache_key})")
            except asyncio.TimeoutError:
                raise HTTPException(504, "Timeout beim Verbinden mit Telegram. Bitte neu anmelden.")
            except Exception as conn_err:
                logger.error(f"[Auth][E2E] ❌ Fallback-Connect fehlgeschlagen: {type(conn_err).__name__}: {conn_err}")
                raise HTTPException(
                    400,
                    f"Verbindung fehlgeschlagen (Fallback-Session): {conn_err}. "
                    "Bitte POST /auth/request-code erneut aufrufen."
                )
        else:
            logger.error(f"[Auth][E2E] ❌ Kein auth_session_string + kein cached client → Flow komplett verloren!")
            raise HTTPException(
                400,
                "Kein aktiver Auth-Flow gefunden. Bitte erst POST /auth/request-code aufrufen. "
                "(Hinweis: Bei mehreren Service-Instanzen muss auth_session_string immer mitgegeben werden.)"
            )
    else:
        # Sicherstellen dass der gecachte Client noch verbunden ist
        logger.info(f"[Auth][E2E] ✅ CACHED-PFAD: Gecachter Client gefunden für key={cache_key} is_connected={client.is_connected()}")
        if not client.is_connected():
            logger.info(f"[Auth][E2E] Gecachter Client war getrennt – reconnect (key={cache_key})")
            try:
                await asyncio.wait_for(client.connect(), timeout=10.0)
                logger.info(f"[Auth][E2E] Reconnect erfolgreich: is_connected={client.is_connected()}")
            except Exception as reconnect_err:
                logger.error(f"[Auth][E2E] ❌ Reconnect fehlgeschlagen: {type(reconnect_err).__name__}: {reconnect_err}")
                raise HTTPException(
                    400,
                    f"Reconnect des gecachten Clients fehlgeschlagen: {reconnect_err}. "
                    "Bitte POST /auth/request-code erneut aufrufen."
                )

    try:
        try:
            logger.info(f"[Auth][E2E] Rufe sign_in() auf: phone={req.phone} phone_code_hash_len={len(req.phone_code_hash)} code_len={len(req.code)}")
            await client.sign_in(req.phone, req.code, phone_code_hash=req.phone_code_hash)
            logger.info(f"[Auth][E2E] ✅ sign_in() erfolgreich!")
        except SessionPasswordNeededError:
            logger.info(f"[Auth][E2E] 2FA erforderlich für {req.phone}")
            if not req.password:
                raise HTTPException(401, "2FA aktiv – bitte Passwort mitschicken (password-Feld)")
            await client.sign_in(password=req.password)
        except PhoneCodeExpiredError as e:
            logger.error(f"[Auth][E2E] ❌ PhoneCodeExpiredError: {type(e).__name__}: {e}")
            raise HTTPException(
                410,
                "Der Bestätigungscode ist abgelaufen. Bitte fordere einen neuen Code an "
                "(POST /auth/request-code erneut aufrufen)."
            )
        except PhoneCodeInvalidError as e:
            logger.error(f"[Auth][E2E] ❌ PhoneCodeInvalidError: {type(e).__name__}: {e}")
            raise HTTPException(400, "Falscher Code – bitte nochmal prüfen.")
        except Exception as sign_err:
            logger.error(f"[Auth][E2E] ❌ sign_in() unbekannter Fehler: {type(sign_err).__name__}: {sign_err}")
            raise

        session_string = client.session.save()
        me = await client.get_me()
        phone = me.phone if me else req.phone

        logger.info(f"[Auth] ✅ Session erstellt für {phone}")
        return VerifyCodeResponse(
            session_string=session_string,
            phone=phone,
            message="Erfolgreich authentifiziert"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Auth] verify-code error: {type(e).__name__}: {e}")
        raise HTTPException(400, f"{type(e).__name__}: {e}")
    finally:
        await _safe_disconnect(client)


@app.post("/auth/check-session", response_model=CheckSessionResponse)
async def check_session(req: CheckSessionRequest):
    """Prüft ob eine gespeicherte Session noch gültig ist."""
    client = make_client(req.api_id, req.api_hash, req.session_string)
    try:
        await client.connect()
        if not await client.is_user_authorized():
            return CheckSessionResponse(valid=False)
        me = await client.get_me()
        return CheckSessionResponse(
            valid=True,
            phone=me.phone if me else None,
            username=me.username if me else None
        )
    except Exception as e:
        logger.warning(f"[Auth] check-session error: {e}")
        return CheckSessionResponse(valid=False)
    finally:
        await client.disconnect()


@app.post("/auth/logout")
async def logout(req: LogoutRequest):
    """Invalidiert die Session."""
    client = make_client(req.api_id, req.api_hash, req.session_string)
    try:
        await client.connect()
        await client.log_out()
        return {"message": "Abgemeldet"}
    except Exception as e:
        logger.warning(f"[Auth] logout error: {e}")
        return {"message": "Session bereits ungültig"}
    finally:
        await client.disconnect()

# ─────────────────────────────────────────────────────────────────────────────
# Channel Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/channels/list", response_model=ChannelListResponse)
async def list_channels(req: ChannelListRequest):
    """
    Listet alle abonnierten Channels/Gruppen des Accounts.
    Gibt nur Channels zurück (kein DMs, keine normalen Gruppen).
    """
    client = make_client(req.api_id, req.api_hash, req.session_string)
    channels = []

    try:
        await client.connect()
        if not await client.is_user_authorized():
            raise HTTPException(401, "Session abgelaufen – erneut anmelden")

        async for dialog in client.iter_dialogs():
            entity = dialog.entity
            if isinstance(entity, Channel):
                ch = ChannelInfo(
                    id=entity.id,
                    title=dialog.title,
                    username=entity.username,
                    members_count=getattr(entity, "participants_count", None)
                )
                channels.append(ch)

        logger.info(f"[Channels] {len(channels)} Channels gefunden")
        return ChannelListResponse(channels=channels)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Channels] list error: {e}")
        raise HTTPException(500, str(e))
    finally:
        await client.disconnect()


@app.post("/channels/history", response_model=ChannelHistoryResponse)
async def get_channel_history(req: ChannelHistoryRequest):
    """
    Holt die letzten Posts eines Channels.
    Bilder werden als Base64-String zurückgegeben (bereit für Weiterverarbeitung).
    min_id > 0 → nur Posts nach diesem Message-ID (für inkrementellen Import).
    """
    import base64

    client = make_client(req.api_id, req.api_hash, req.session_string)
    posts = []
    limit = min(req.limit, 100)

    try:
        await client.connect()
        if not await client.is_user_authorized():
            raise HTTPException(401, "Session abgelaufen")

        # Channel resolven (@username, numerische ID, oder t.me/... Link)
        channel_input = req.channel.strip()
        try:
            entity = await client.get_entity(channel_input)
        except Exception:
            raise HTTPException(404, f"Channel '{req.channel}' nicht gefunden oder kein Zugriff")

        logger.info(f"[History] Lade {limit} Posts aus {req.channel} (min_id={req.min_id})")

        kwargs = {"entity": entity, "limit": limit}
        if req.min_id > 0:
            kwargs["min_id"] = req.min_id

        async for message in client.iter_messages(**kwargs):
            if not message.message and not message.media:
                continue

            text = message.message or ""
            photo_bytes_list = []
            has_media = False

            # Bilder herunterladen
            if message.media:
                has_media = True
                try:
                    if isinstance(message.media, (MessageMediaPhoto, MessageMediaDocument)):
                        buf = io.BytesIO()
                        await client.download_media(message, file=buf)
                        buf.seek(0)
                        raw = buf.read()
                        if raw:
                            b64 = base64.b64encode(raw).decode("utf-8")
                            photo_bytes_list.append(b64)
                except Exception as img_err:
                    logger.warning(f"[History] Bild-Download fehlgeschlagen msgId={message.id}: {img_err}")

            post = TelegramPost(
                message_id=message.id,
                text=text,
                photo_urls=[],          # Leer – Bytes kommen via photo_bytes_list
                photo_bytes_list=photo_bytes_list,
                date=message.date.isoformat() if message.date else "",
                from_channel=req.channel,
                has_media=has_media
            )
            posts.append(post)

        logger.info(f"[History] ✅ {len(posts)} Posts geladen aus {req.channel}")
        return ChannelHistoryResponse(posts=posts, channel=req.channel)

    except HTTPException:
        raise
    except FloodWaitError as e:
        raise HTTPException(429, f"Telegram Rate-Limit: Warte {e.seconds}s")
    except Exception as e:
        logger.error(f"[History] error: {e}")
        raise HTTPException(500, str(e))
    finally:
        await client.disconnect()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "telegram-scraper", "pending_auth_sessions": len(_pending_auth)}

@app.get("/debug/pending")
async def debug_pending():
    """Zeigt aktive Auth-Sessions im RAM (nur für Debugging)."""
    result = {}
    for key, client in _pending_auth.items():
        result[key] = {"connected": client.is_connected()}
    return {"pending": result, "count": len(_pending_auth)}

@app.post("/debug/reset-pending")
async def reset_pending():
    """Räumt alle hängenden Auth-Sessions auf (Admin-Reset)."""
    count = len(_pending_auth)
    for key, client in list(_pending_auth.items()):
        try:
            await asyncio.wait_for(client.disconnect(), timeout=2.0)
        except Exception:
            pass
    _pending_auth.clear()
    logger.info(f"[Debug] Pending-Auth-Cache geleert: {count} Sessions entfernt")
    return {"cleared": count, "message": f"{count} hängende Sessions entfernt"}

