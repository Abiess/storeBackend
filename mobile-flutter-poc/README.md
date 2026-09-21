# markt.ma — Flutter PoC: DOCUMENTS Fotografieren → Upload

Isolierter Proof-of-Concept. **Keine Migration**, keine Aenderung an
Spring Boot Backend, Angular/Capacitor oder MinIO. Testet nur:

> Login → DOCUMENTS-Liste → Fotografieren (native Kamera) → Upload → Erfolg/Fehler anzeigen

gegen das **bestehende, unveraenderte** `storeBackend` (Port 8080, `/api/...`).

## 1. Bestehende API-Vertraege (1:1 uebernommen, siehe Audit)

| Zweck | Methode + Pfad | Request | Response |
|---|---|---|---|
| Login | `POST /api/auth/login` | `{"email":"...","password":"..."}` (`LoginRequest.java`) | `{"token":"...","user":{...}}` (`AuthResponse.java`) |
| Doku-Liste | `GET /api/documents` | Header `Authorization: Bearer <token>` | `List<DocumentDTO>` |
| Foto-Upload | `POST /api/documents/upload` (multipart) | Felder `file` (Bild) + `title` (String, Pflicht); optional `category`, `note`, `documentDate`, `expiryDate` als eigene Form-Felder (KEIN JSON-Part!) | `DocumentDTO` |

- Kein `server.servlet.context-path` — alle Pfade direkt unter `/api/...`.
- Fehler kommen konsistent als `{"status":..,"error":"...","message":"...","code":"..."}`
  (`GlobalExceptionHandler`) — der PoC liest nur `message`.
- `DocumentController` traegt `@RequiresApp(DOCUMENTS, scope=NONE)` — Entitlement
  wird **automatisch serverseitig** geprueft (DB-Lookup ueber `userId`); ein User
  ohne DOCUMENTS-Zugang bekommt schlicht `403` auf jeden `/api/documents/**`-Call.
  Es gibt (und braucht) keinen separaten Entitlement-Check-Endpunkt im Client.
- JWT ist ein einzelnes, 7 Tage gueltiges Token (`jwt.expiration=604800000` in
  `application.yml`) — **kein** Refresh-Token-Endpunkt vorhanden, daher im PoC
  bewusst kein Refresh-Flow gebaut.

## 2. Projektstruktur

```
mobile-flutter-poc/
  pubspec.yaml
  lib/
    main.dart                      # App-Entry, AuthGate
    config/api_config.dart         # Basis-URL (per --dart-define umschaltbar)
    models/
      auth_response.dart           # spiegelt AuthResponse.java
      document_dto.dart            # spiegelt DocumentDTO.java
    services/
      token_storage.dart           # JWT in Android Keystore/iOS Keychain
      auth_service.dart            # POST /api/auth/login
      documents_service.dart       # GET /api/documents, POST /api/documents/upload
    screens/
      login_screen.dart            # Login-Form + AuthGate (Token vorhanden? -> skip Login)
      documents_screen.dart        # Liste + FAB "Fotografieren" (image_picker Kamera)
```

## 3. Verwendete Packages (bewusst minimal)

- `http` — HTTP-Client (kein Dio, kein Retrofit-aehnliches Codegen noetig fuer 3 Endpunkte)
- `http_parser` — expliziter `MediaType` fuer den Multipart-Filepart (siehe unten, WICHTIG)
- `flutter_secure_storage` — JWT sicher lokal halten (Keystore/Keychain)
- `image_picker` — **native** Kamera (kein Web-`<input capture>`-Workaround noetig)

Kein State-Management-Framework (Provider/Bloc/Riverpod) — reines `setState()`,
da der PoC nur 2 Screens hat.

## 4. Setup (dieses Environment hat kein Flutter SDK installiert)

Dieser Ordner enthaelt nur `pubspec.yaml` + `lib/` (reinen Dart-Code). Die
Platform-Ordner (`android/`, `ios/`) muessen einmalig lokal generiert werden,
da sie hier nicht automatisiert erzeugt werden konnten:

```powershell
# 1. Leeres Flutter-Projekt als Geruest erzeugen (generiert android/, ios/, etc.)
flutter create --project-name markt_ma_documents_poc --org ma.markt mobile-flutter-poc-scaffold

# 2. Generierte android/, ios/, web/, .metadata etc. in DIESEN Ordner (mobile-flutter-poc/) kopieren,
#    dabei das hier bereits vorhandene lib/ und pubspec.yaml NICHT ueberschreiben.

# 3. Abhaengigkeiten holen
cd mobile-flutter-poc
flutter pub get
```

### Kamera-Berechtigungen ergaenzen (nach Schritt 1, einmalig)

**Android** — `android/app/src/main/AndroidManifest.xml`, innerhalb `<manifest>`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**iOS** — `ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>markt.ma benoetigt die Kamera, um Dokumente zu fotografieren.</string>
```

### Backend-URL

Default ist `http://10.0.2.2:8080` (Android-Emulator -> Host-Localhost). Fuer
physisches Geraet/iOS-Simulator im selben Netz oder Produktion:

```powershell
flutter run --dart-define=MARKT_MA_API_BASE_URL=https://api.markt.ma
```

## 5. Was aus markt.ma direkt wiederverwendet wurde

- **API-Vertraege exakt 1:1**: Feldnamen aus `LoginRequest`, `AuthResponse`,
  `DocumentDTO` unveraendert uebernommen — keine parallele DTO-Definition erfunden.
- **Multipart-Feldnamen** (`file`, `title`) exakt wie vom bestehenden
  `DocumentController.upload(...)` erwartet.
- **Backend/Entitlements/MinIO/JWT-Ausstellung** unveraendert — der PoC ist
  ein reiner Consumer der bestehenden Vertraege.
- **Design-Token** (Lila `#667eea`) als Farbe im `ThemeData` uebernommen (rein kosmetisch).

## 6. Was Flutter-spezifisch neu gebaut werden musste

- Kompletter Auth-/Token-Storage-Layer (Angular hat `AuthInterceptor`/`localStorage`
  bzw. Capacitor-Preferences — in Flutter neu: `TokenStorage` via `flutter_secure_storage`).
- Multipart-Upload-Client von Grund auf (Angular nutzt `HttpClient`+`FormData`,
  Flutter nutzt `http.MultipartRequest` — andere API, gleiches Wire-Format).
- Explizite `MediaType`-Bestimmung fuer den Foto-Part (siehe `documents_service.dart`):
  ohne das wuerde `http.MultipartFile.fromPath` sonst ggf. `application/octet-stream`
  senden — **dasselbe Risiko**, das beim Angular/Android-Bugfix bereits einmal
  aufgetreten ist. Hier von Anfang an vermieden statt spaeter debuggt.
- Kompletter UI-Layer (kein `ResponsiveDataListComponent`/`PageHeaderComponent` etc.
  wiederverwendbar — Flutter-Widgets sind eine komplett andere Rendering-Welt).

## 7. Aufwand/Risiko-Einschaetzung fuer eine spaetere schrittweise Migration

**Aufwand pro echtem App-Factory-Client (realistisch, nicht PoC-Umfang):**
- Auth/Token/Interceptor-Layer: 1× bauen, dann wiederverwendbar — gering (Tage).
- Pro App (DOCUMENTS, SHOP, DHL, LOYALTY, ...): jeweils eigener Screen-/Service-Layer,
  da es in Flutter **keine** Entsprechung zur bestehenden Angular-`ResponsiveDataListComponent`-
  Shared-Factory gibt — muesste als eigenes Flutter-Widget-Set neu gebaut und
  gepflegt werden (Parallel-Wartung von 2 UI-Bibliotheken: Angular + Flutter).
- Multi-Tenant/Store-Scope-Handling (`storeId`-Propagation, `StoreAccessChecker`-
  Ergebnisse) muss im Flutter-Client parallel nachgebaut werden (aktuell 0% vorhanden).
- i18n (de/en/ar inkl. RTL) muesste komplett neu aufgesetzt werden (`intl`/ARB-Dateien).

**Risiken:**
- Zwei parallele Frontend-Stacks (Angular/Capacitor + Flutter) bedeuten doppelte
  UI-Pflege fuer jede neue Funktion, bis/falls eine App vollstaendig migriert ist.
- Capacitor deckt "native Look" bereits ab (Kamera, Storage etc.) — der
  Mehrwert von Flutter besteht v.a. bei **Performance-kritischen** oder
  **tief nativen** Features, nicht bei CRUD-lastigen Business-Screens wie DOCUMENTS.
- Kein Big-Bang: realistisch waere, falls ueberhaupt, ein App-fuer-App-Ansatz
  beginnend mit der App mit dem hoechsten "native Feature"-Bedarf.

## 8. Offene Punkte (bewusst NICHT Teil dieses PoC)

- Kein Refresh-Token-Flow (Backend bietet aktuell keinen).
- Keine Android-/iOS-Platform-Ordner in diesem Repo (siehe Setup oben — muessen
  lokal per `flutter create` generiert werden, da in dieser Entwicklungsumgebung
  kein Flutter SDK installiert ist und `flutter analyze`/`flutter run` hier
  nicht ausgefuehrt werden konnten).
- Keine automatisierten Tests (PoC-Scope).
