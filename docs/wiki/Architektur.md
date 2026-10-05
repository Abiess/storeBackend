# Architektur

[Zur Übersicht](README.md)

Markt.ma betreibt Angular und Flutter mit demselben Spring-Boot-Backend. Eine Änderung am Backend kann beide Clients betreffen; Oberflächenänderungen müssen in jedem Client separat umgesetzt werden.

| Bereich | Repository-Pfad | Aufgabe |
|---|---|---|
| Backend | `src/main/java/storebackend/` | APIs, Anmeldung, Shoplogik |
| Angular | `storeFrontend/` | Web-Shop und Administration |
| Flutter | `mobile-flutter-poc/` | Mobile und Web-Apps, unter anderem Shop und Documents |
| SQL-Migrationen | `scripts/db/migrations/` | Änderungen für den Deployment-Pfad |
| Automatisierung | `.github/workflows/` | Prüfung, Builds und Deployments |

Das Backend verwendet PostgreSQL für Daten und MinIO für Dateien. Store-Kontext und Kundenberechtigungen müssen bei API-Zugriffen erhalten bleiben.

## Einstieg in den Code

- [Backend-Controller](../../../src/main/java/storebackend/controller/)
- [Angular-Routen](../../../storeFrontend/src/app/app.routes.ts)
- [Flutter-Entrypoints](../../../mobile-flutter-poc/lib/entrypoints/)
- [Workflows](../../../.github/workflows/)

## Domains

Die Plattform nutzt `markt.ma`, Shops können über Subdomains wie `marrakesch.markt.ma` aufgerufen werden. Die Shop-Auflösung liefert Store-ID und Einstellungen. Frontend-Code darf beim Wechsel auf Produkt-, Warenkorb- oder Auftragsseiten nicht auf Plattform-Einstellungen zurückfallen.
