# Datenschutzerklärung für markt.ma

**Letzte Aktualisierung:** 25.06.2026  
**Status:** ENTWURF – Benötigt juristische Prüfung

> **⚠️ WICHTIG:** Diese Datenschutzerklärung basiert auf der technischen Analyse des Codes und muss vor Veröffentlichung von einem Fachanwalt für Datenschutzrecht geprüft und angepasst werden. Markierungen mit `[TODO]` erfordern besondere Aufmerksamkeit.

---

## 1. Verantwortlicher

**[TODO: Hier vollständige Firmendaten eintragen]**

Name/Firma:  
Anschrift:  
E-Mail:  
Telefon:  

Vertretungsberechtigt:  
Handelsregister:  
USt-IdNr.:  

**Datenschutzbeauftragter:** [TODO: Falls erforderlich, Kontaktdaten ergänzen]

---

## 2. Hosting und technische Infrastruktur

### 2.1 IONOS als Auftragsverarbeiter

Die Server-Infrastruktur von markt.ma wird bei **IONOS SE** (Elgendorfer Str. 57, 56410 Montabaur, Deutschland) gehostet.

**Rechtsgrundlage:** Art. 28 DSGVO (Auftragsverarbeitung)

**[TODO: Bestätigen]** Mit IONOS wurde eine Vereinbarung zur Auftragsverarbeitung nach Art. 28 DSGVO abgeschlossen. IONOS verarbeitet personenbezogene Daten ausschließlich nach unseren dokumentierten Weisungen und ausschließlich innerhalb der EU/EWR.

**Folgende Daten werden auf IONOS-Servern gespeichert:**
- PostgreSQL-Datenbank mit Nutzer-, Store-, Bestell- und Produktdaten
- MinIO-Objektspeicher (S3-kompatibel) mit hochgeladenen Bildern und Medien
- Server-Logs (Zugriffs- und Fehlerprotokolle)

**Weitere Informationen:** https://www.ionos.de/terms-gtc/datenschutzerklaerung/

---

## 3. Welche personenbezogenen Daten werden verarbeitet?

### 3.1 Nutzerkonto (User Account)

**Bei Registrierung/Login speichern wir:**
- E-Mail-Adresse (als eindeutige Kennung, Pflichtfeld)
- Name (optional)
- Passwort-Hash (verschlüsselt mit bcrypt, Original-Passwort wird NICHT gespeichert)
- Telefonnummer (optional, für WhatsApp/Telegram-Authentifizierung)
- E-Mail-Verifizierungsstatus (boolean)
- Bevorzugte Sprache (de/en/ar/fr)
- Zugewiesene Rollen (z.B. STORE_OWNER, ADMIN)
- Registrierungs- und Aktualisierungszeitpunkte

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – zur Bereitstellung des Dienstes erforderlich)

**Speicherdauer:** Solange das Nutzerkonto aktiv ist. Nach Löschung des Accounts werden alle zugehörigen personenbezogenen Daten entfernt, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.

---

### 3.2 Store-Daten (Shop-Informationen)

**Jeder erstellte Shop speichert:**
- Shop-Name
- Shop-Slug (URL-Identifikator)
- Beschreibung
- Kontakt-E-Mail (optional)
- Kontakt-Telefonnummer (optional)
- WhatsApp-Nummer (optional, für Kundenkontakt)
- Adresse, Öffnungszeiten (optional, für Restaurant/Riad-Betreiber)
- Social-Media-Links (Facebook, Instagram, TikTok, Telegram)
- Logo, Banner-Bilder, Slider-Bilder (URLs zu MinIO-Speicher)
- Fußzeilen-Text, Begrüßungsnachricht
- Shop-Status (aktiv, inaktiv, gelöscht)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – Bereitstellung der Shop-Plattform)

**Speicherdauer:** Solange der Shop aktiv ist. Store-Betreiber können ihren Shop und alle Inhalte jederzeit über das Dashboard löschen.

---

### 3.3 Bestellungen (Orders)

**Bei jeder Bestellung speichern wir:**
- Bestellnummer (eindeutig generiert)
- Bestell-Status (ausstehend, versandt, geliefert, storniert)
- Gesamtbetrag, Versandkosten
- Zahlungsmethode (Bar bei Lieferung, Kreditkarte, etc.)
- Tracking-Nummer, Tracking-URL (falls vorhanden)
- Notizen/Anmerkungen

**Liefer- und Rechnungsadresse (eingebettet):**
- Vorname, Nachname
- Adresszeile 1 + 2
- Stadt, Postleitzahl, Land
- Telefonnummer

**Kunden-E-Mail:** Falls der Kunde ein Konto hat, wird sein User verlinkt; andernfalls wird die E-Mail-Adresse separat gespeichert.

**Telefonnummer-Verifizierung (optional bei COD):**
- Telefonnummer
- Verifizierungscode (zeitlich begrenzt gültig)
- Kanal (SMS/WhatsApp)
- Verifizierungs-Status

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – Abwicklung der Bestellung erforderlich)

**Speicherdauer:**  
- Bestelldaten: [TODO: Festlegen, z.B. 10 Jahre gemäß HGB §257 für steuerrelevante Unterlagen]
- Verifizierungscodes: Automatisch nach 10 Minuten abgelaufen

---

### 3.4 Kundenprofil (Customer Profile)

**Registrierte Kunden können folgende Daten hinterlegen:**
- Vorname, Nachname
- Telefonnummer
- Standard-Lieferadresse (Adresse, Stadt, PLZ, Land, Telefon)
- Standard-Rechnungsadresse
- Gespeicherte Warenkörbe
- Wunschliste (Lieblingsprodukte)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) und Art. 6 Abs. 1 lit. a DSGVO (Einwilligung für optionale Funktionen)

**Speicherdauer:** Solange das Kundenkonto besteht. Löschung über Account-Einstellungen oder auf Anfrage.

---

### 3.5 Produkt-Bewertungen (Reviews)

**Kunden können Produkte bewerten:**
- Bewertung (1-5 Sterne)
- Titel und Kommentar
- Verknüpfung mit User-Account
- Verknüpfung mit Bestellung (für "Verifizierter Kauf"-Badge)
- Zeitstempel

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Absenden der Bewertung)

**Speicherdauer:** Solange das Produkt existiert oder bis zur Löschung durch den Nutzer/Shop-Betreiber.

---

### 3.6 Chat/Support-Nachrichten

**Bei Nutzung des Chatbot/Support-Chats speichern wir:**
- Nachrichteninhalt
- Absender (User oder System)
- Absendername
- Zeitstempel
- Lesestatus

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – Kundenservice)

**Speicherdauer:** Chat-Sessions werden [TODO: Zeitraum festlegen, z.B. 30 Tage] nach letzter Aktivität gelöscht.

---

### 3.7 Medien-Uploads (MinIO/S3-Speicher)

**Hochgeladene Dateien (Bilder, Logos, Banner) werden gespeichert mit:**
- Dateiname
- MIME-Type
- Größe
- Upload-Zeitpunkt
- Zuordnung zu Store oder User

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)

**Speicherdauer:** Solange der zugehörige Store/User existiert. Bei Löschung des Stores werden alle zugehörigen Medien entfernt.

---

### 3.8 Authentifizierung (JWT-Tokens, Passwort-Reset)

**JWT-Tokens (JSON Web Tokens):**
- Werden im Browser des Nutzers gespeichert (localStorage)
- Enthalten: User-ID, Rollen, Ablaufzeit
- Sind SIGNIERT (können nicht gefälscht werden) und zeitlich begrenzt gültig

**Passwort-Reset-Tokens:**
- Temporäre Tokens für Passwort-Zurücksetzen (in DB gespeichert)
- Ablaufzeit: [TODO: Festlegen, z.B. 1 Stunde]

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – Authentifizierung notwendig)

**Speicherdauer:**
- JWT-Tokens: Bis Logout oder automatischer Ablauf
- Reset-Tokens: Automatisch nach Ablauf gelöscht

---

### 3.9 LocalStorage und Cookies

**Wir verwenden LocalStorage (Browser-Speicher) für:**
- `auth_token` – JWT-Authentifizierungstoken
- `currentUser` – Basis-Nutzerdaten (ID, E-Mail, Rollen) für schnellen Zugriff
- `cart_session_id` – Session-ID für Gast-Warenkörbe
- `preferredLanguage` – Gespeicherte Spracheinstellung (de/en/ar/fr)
- `notification_settings` – Benachrichtigungseinstellungen (lokal, nicht an Server gesendet)
- `onboarding_dismissed_<storeId>` – Onboarding-Status (lokal)
- `checkout_form_data` – Temporäre Speicherung von Checkout-Formulardaten (zur Wiederherstellung bei Seitenreload)
- `chatbot_session` – Chatbot-Session-ID

**Cookies:**  
[TODO: Liste aller verwendeten Cookies ergänzen, inkl. Drittanbieter-Cookies]

**Rechtsgrundlage:**
- Technisch notwendige Cookies: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse – Funktionsfähigkeit der Website)
- Tracking-Cookies (siehe 3.10): Art. 6 Abs. 1 lit. a DSGVO (Einwilligung via Cookie-Banner)

**Speicherdauer:** LocalStorage bleibt bestehen bis manueller Logout oder Löschen der Browser-Daten.

---

### 3.10 Analytics und Tracking

#### **Microsoft Clarity**

**Wir nutzen Microsoft Clarity für:**
- Session-Recordings (anonymisierte Bildschirmaufzeichnungen)
- Heatmaps (Klick- und Scroll-Verhalten)
- Benutzererfahrungs-Analysen

**Gespeicherte Daten:**
- IP-Adresse (anonymisiert)
- Geräte- und Browser-Informationen
- Seitenaufrufe und Navigation
- Mausbewegungen, Klicks, Scrollverhalten

**Integration:**  
- Clarity wird nur geladen, wenn in `environment.prod.ts` eine `clarityId` konfiguriert ist
- In der Entwicklungsumgebung (localhost) ist Clarity NICHT aktiv
- User-ID wird bei eingeloggten Nutzern übertragen (für personalisierte Analysen)

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung via Cookie-Banner)

**[TODO: Cookie-Banner implementieren, der Clarity erst nach Zustimmung lädt]**

**Weitere Informationen:** https://clarity.microsoft.com/terms

#### **Meta Pixel (Facebook Pixel)**

**[TODO: Prüfen ob aktiv – derzeit KEIN pixelId in environment.prod.ts konfiguriert]**

Falls aktiviert, würde Meta Pixel folgende Daten erfassen:
- Seitenaufrufe
- Conversion-Events (z.B. Store-Erstellung, Produktkäufe)
- IP-Adresse, Browser-Fingerprint

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung via Cookie-Banner erforderlich)

**[TODO: Falls Meta Pixel genutzt wird, Standard-Vertragsklauseln mit Meta prüfen (Drittlandtransfer USA)]**

---

### 3.11 Telegram-Integration (Import von Produkten)

**[TODO: Prüfen ob aktiv]**

Falls Telegram-Import aktiviert ist, können Store-Betreiber Produkte aus Telegram-Kanälen importieren. Dabei werden gespeichert:
- Telegram-Chat-ID
- Importierte Nachrichteninhalte (Text, Bilder)
- Sync-Logs

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung – vom Store-Betreiber explizit aktiviert)

**Hinweis:** Die Telegram-API wird direkt vom Store-Betreiber genutzt. markt.ma speichert nur die importierten Produktdaten, NICHT die vollständigen Telegram-Nachrichten.

---

### 3.12 Server-Logs (Zugriffs- und Fehlerprotokolle)

**Automatisch protokolliert werden:**
- IP-Adresse (für max. 7 Tage, dann anonymisiert)
- Zeitstempel
- Aufgerufene URL
- HTTP-Statuscode
- User-Agent (Browser und Betriebssystem)
- Fehlermeldungen

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse – IT-Sicherheit, Fehleranalyse, Missbrauchsschutz)

**Speicherdauer:** Logs werden nach [TODO: Festlegen, z.B. 30 Tagen] automatisch gelöscht oder überschrieben.

---

## 4. Zwecke der Datenverarbeitung

Wir verarbeiten personenbezogene Daten ausschließlich für folgende Zwecke:

1. **Registrierung und Login** – Bereitstellung von Nutzerkonten
2. **Shop-Erstellung und -Verwaltung** – Ermöglichung der SaaS-Plattform
3. **Bestellabwicklung** – Verarbeitung von Kundenbestellungen, Versand, Zahlungsabwicklung
4. **Kundenservice** – Support via Chat, E-Mail, WhatsApp
5. **IT-Sicherheit** – Schutz vor Missbrauch, DDoS-Angriffen, Betrug
6. **Gesetzliche Pflichten** – Erfüllung steuerrechtlicher und handelsrechtlicher Aufbewahrungspflichten
7. **Produktverbesserung** – Analyse des Nutzerverhaltens (nur mit Einwilligung via Cookie-Banner)

---

## 5. Datenweitergabe an Dritte

**Wir geben Ihre Daten NICHT an Dritte weiter, außer:**

1. **Auftragsverarbeiter (Art. 28 DSGVO):**
   - IONOS (Hosting)
   - [TODO: Weitere Dienstleister ergänzen, z.B. E-Mail-Versand, Zahlungsanbieter]

2. **Gesetzliche Verpflichtungen:**
   - Strafverfolgungsbehörden (bei begründetem Verdacht auf Straftaten)
   - Finanzbehörden (bei steuerrechtlichen Prüfungen)

3. **Mit Ihrer Einwilligung:**
   - z.B. bei Nutzung von externen Zahlungsanbietern

**Kein Verkauf von Daten:** Wir verkaufen oder vermieten Ihre Daten NIEMALS an Dritte.

---

## 6. Datenübermittlung in Drittländer

**IONOS-Server stehen ausschließlich in der EU (Deutschland).**

**[TODO: Falls Microsoft Clarity oder Meta Pixel aktiv]**  
Falls Analytics-Dienste wie Microsoft Clarity (USA) oder Meta Pixel (USA) aktiviert sind, erfolgt eine Datenübermittlung in die USA. Dies geschieht nur nach vorheriger Einwilligung (Cookie-Banner) und unter Einsatz von Standard-Vertragsklauseln (Art. 46 DSGVO).

**[TODO: Prüfen ob weitere Drittlanddienste genutzt werden]**

---

## 7. Ihre Rechte nach DSGVO

Sie haben jederzeit folgende Rechte:

### 7.1 Auskunftsrecht (Art. 15 DSGVO)
Sie können Auskunft über Ihre gespeicherten Daten verlangen.

### 7.2 Berichtigungsrecht (Art. 16 DSGVO)
Sie können unrichtige Daten korrigieren lassen.

### 7.3 Löschungsrecht (Art. 17 DSGVO – "Recht auf Vergessenwerden")
Sie können die Löschung Ihrer Daten verlangen, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.

**So löschen Sie Ihre Daten:**
1. **Account-Löschung:** [TODO: Funktion noch nicht implementiert] Per E-Mail anfragen
2. **Store-Löschung:** Store-Betreiber können ihren Shop über Einstellungen → Erweitert → "Shop dauerhaft löschen"
3. **Per E-Mail:** Kontaktieren Sie uns unter [TODO: Datenschutz-E-Mail eintragen]

**Wichtig:**
- Bei Account-Löschung werden alle zugehörigen personenbezogenen Daten aus aktiven Systemen entfernt
- Bestelldaten werden aufgrund gesetzlicher Aufbewahrungspflichten (§ 257 HGB, § 147 AO) für 10 Jahre **anonymisiert** (Name/E-Mail/Telefon entfernt, Bestellnummer/Datum/Betrag bleiben)
- Backups können für [TODO: Backup-Retention-Zeit, z.B. 30 Tage] weiter bestehen und werden danach automatisch gelöscht oder überschrieben

### 7.4 Einschränkungsrecht (Art. 18 DSGVO)
Sie können die Einschränkung der Verarbeitung verlangen (z.B. bei Bestreiten der Richtigkeit).

### 7.5 Datenübertragbarkeit (Art. 20 DSGVO)
Sie können Ihre Daten in einem strukturierten, maschinenlesbaren Format erhalten (z.B. JSON-Export).

### 7.6 Widerspruchsrecht (Art. 21 DSGVO)
Sie können der Verarbeitung widersprechen, soweit diese auf berechtigten Interessen (Art. 6 Abs. 1 lit. f) basiert.

### 7.7 Widerrufsrecht (Art. 7 Abs. 3 DSGVO)
Sie können erteilte Einwilligungen (z.B. Cookie-Banner, Newsletter) jederzeit widerrufen.

### 7.8 Beschwerderecht (Art. 77 DSGVO)
Sie können sich bei der zuständigen Datenschutz-Aufsichtsbehörde beschweren:

**[TODO: Zuständige Aufsichtsbehörde eintragen, z.B.:**  
Landesbeauftragte für Datenschutz und Informationsfreiheit  
[Adresse]  
[Website]  
**]**

---

## 8. Datensicherheit

**Wir setzen folgende Sicherheitsmaßnahmen ein:**

1. **Verschlüsselung:**
   - HTTPS/TLS für alle Verbindungen
   - Passwörter werden mit bcrypt gehashed (NIEMALS im Klartext gespeichert)
   - JWT-Tokens sind signiert und zeitlich begrenzt

2. **Zugriffskontrolle:**
   - Rollenbasierte Berechtigungen (STORE_OWNER, ADMIN)
   - Zugriff auf Produktions-Server nur für autorisierte Administratoren

3. **Regelmäßige Backups:**
   - Datenbank-Backups werden [TODO: Backup-Intervall, z.B. täglich] erstellt
   - Backups werden [TODO: Backup-Retention, z.B. 30 Tage] aufbewahrt

4. **Monitoring und Logging:**
   - Server-Logs zur Erkennung von Angriffen
   - Automatische Löschung von Logs nach [TODO: z.B. 30 Tagen]

**Trotz aller Sicherheitsmaßnahmen:** Eine 100%ige Sicherheit bei Datenübertragung über das Internet gibt es nicht. Nutzen Sie sichere Passwörter und aktivieren Sie Zwei-Faktor-Authentifizierung, falls verfügbar.

---

## 9. Datenminimierung und Pseudonymisierung

**Wir befolgen die Grundsätze der DSGVO:**

- **Datenminimierung (Art. 5 Abs. 1 lit. c DSGVO):**  
  Wir speichern nur Daten, die für den jeweiligen Zweck erforderlich sind
  
- **Pseudonymisierung (Art. 4 Nr. 5 DSGVO):**  
  Wo möglich (z.B. Analytics, abgelaufene Bestellungen) werden personenbezogene Merkmale durch Platzhalter ersetzt
  
- **Anonymisierung:**  
  Server-Logs: IP-Adressen werden nach [TODO: z.B. 7 Tagen] anonymisiert (z.B. `192.168.xxx.xxx`)  
  Bestellungen: Nach Ablauf der Aufbewahrungsfrist werden Name, E-Mail, Telefon und vollständige Adresse entfernt

**Klare Aussage:**  
Wir verarbeiten personenbezogene Daten nur, soweit erforderlich. Soweit möglich, werden Daten anonymisiert oder pseudonymisiert verarbeitet.

**Wir machen KEINE falschen Aussagen:** Accounts, E-Mails und Bestellungen enthalten personenbezogene Daten und werden entsprechend den DSGVO-Anforderungen geschützt. Diese Daten sind NICHT "anonym", sondern werden aktiv verwaltet und bei Löschung oder nach Ablauf der Aufbewahrungspflicht anonymisiert.

---

## 10. Automatisierte Entscheidungsfindung (Profiling)

**[TODO: Prüfen]**

Derzeit setzen wir KEIN automatisiertes Profiling ein, das rechtliche Wirkung entfaltet (Art. 22 DSGVO).

Falls in Zukunft KI-basierte Produktempfehlungen oder Risikobewertungen (z.B. Betrugsschutz) eingesetzt werden, informieren wir Sie hier und holen ggf. Ihre Einwilligung ein.

---

## 11. Kinder

Unser Dienst richtet sich nicht an Personen unter 16 Jahren. Wir erfassen wissentlich keine Daten von Kindern unter 16 Jahren.

**[TODO: Altersverifizierung prüfen, falls erforderlich]**

---

## 12. Änderungen dieser Datenschutzerklärung

Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an geänderte Rechtslage oder Funktionen anzupassen.

**Aktuelle Version:** Immer abrufbar unter [TODO: URL zur Datenschutzerklärung]

**Bei wesentlichen Änderungen:** Informieren wir Sie per E-Mail oder Banner auf der Website.

---

## 13. Kontakt

**Fragen zum Datenschutz?**

E-Mail: [TODO: Datenschutz-E-Mail eintragen]  
Telefon: [TODO: Optional]

**Verantwortlicher (siehe Punkt 1):**  
[TODO: Kontaktdaten wiederholen]

---

## 14. TODO-Liste für juristische Prüfung

**Vor Veröffentlichung ZWINGEND prüfen lassen:**

- [ ] Vollständige Firmendaten (Punkt 1)
- [ ] AVV mit IONOS vorhanden und aktuell (Punkt 2.1)
- [ ] Alle genutzten Auftragsverarbeiter aufgelistet (Punkt 5)
- [ ] Speicherfristen festlegen (Punkte 3.3, 3.6, 3.12)
- [ ] Cookie-Banner implementieren BEVOR Clarity/Meta Pixel aktiviert wird (Punkt 3.10)
- [ ] Prüfen ob Meta Pixel genutzt wird (Punkt 3.10)
- [ ] Prüfen ob Telegram-Import aktiv ist (Punkt 3.11)
- [ ] Zuständige Datenschutzbehörde eintragen (Punkt 7.8)
- [ ] Backup-Strategie und Retention-Zeiten dokumentieren (Punkt 8)
- [ ] Prüfen ob automatisierte Entscheidungsfindung/Profiling eingesetzt wird (Punkt 10)
- [ ] URL zur Datenschutzerklärung auf Website (Punkt 12)
- [ ] Datenschutz-Kontakt-E-Mail einrichten (Punkt 13)
- [ ] Impressum mit Datenschutzerklärung verlinken
- [ ] AGB mit Datenschutzerklärung abgleichen

**Zusätzlich empfohlen:**
- [ ] Datenschutz-Folgenabschätzung (DSFA) durchführen
- [ ] Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO) erstellen
- [ ] Technische und organisatorische Maßnahmen (TOMs) dokumentieren

---

**Stand:** 25.06.2026 (Entwurf basierend auf Code-Analyse)  
**Erstellt von:** GitHub Copilot CLI (technische Analyse)  
**Rechtliche Prüfung ausstehend:** ⚠️ NICHT VERÖFFENTLICHEN ohne Anwalts-Review!
