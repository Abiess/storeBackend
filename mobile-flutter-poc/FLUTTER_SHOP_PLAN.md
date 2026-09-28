# Flutter-Kunden-Shop: erster Schritt und Wiederverwendung

## Abgrenzung

Der neue Einstieg `lib/entrypoints/main_shop.dart` startet eine öffentliche
Kunden-Shop-Vorschau. Er verwendet absichtlich weder `AuthGate` noch DHL-
Navigation oder DHL-Services. Der vorhandene Angular-Shop und die drei
Mitarbeiter-/Fach-Apps bleiben unangetastet.

## Was wir übernehmen können

- `MarktTheme` und `MarktSpacing` aus `lib/theme/markt_theme.dart` als
  Markenfarben, Schrift- und Abstandsgrundlage.
- Kleine UI-Primitiven wie `MarktCard`, wenn sie zum jeweiligen Shop-Bildschirm
  passen.
- HTTP-Fehlerbehandlung und Testmuster der vorhandenen Services als Beispiele;
  die Endpunkte und DTOs des Kunden-Shops müssen aber separat geprüft werden.
- Die Flutter CI und vorhandenen Android/Web-Builds als Basis für Builds.

## Was wir nicht in den Kunden-Shop ziehen

- DHL-Login/Store-Entitlements: öffentliche Produktansicht braucht keinen
  Mitarbeiter-Login.
- Barcode-Scanner, Paket-DTOs, DHL-Service und DHL-Dashboard: fachfremd.
- `MarktAppShell`/Seitennavigation für interne Arbeitsbereiche: ein Shop braucht
  mobile Shop-Navigation und einen eigenen Checkout-Ablauf.

## UI-Referenz

Als Layout-Inspiration dient [MarketKy](https://github.com/mrezkys/marketky),
ein MIT-lizenziertes Flutter-Commerce-Starterprojekt mit Startseite, Suche,
Kategorien, Produktdetails und Warenkorb. Das Repository ist älter; wir
übernehmen daher keine fremden Dateien oder Bilddateien, sondern setzen die
passenden Muster mit markt.ma Theme und Widgets eigenständig um.

## Geplante kleine PR-Schritte

1. **Shop-Startseite als klickbare Vorschau** (dieser Schritt): responsive
   Startseite, Kategorie-Filter, Produktkarten und Warenkorb-Zähler mit klar
   markierten Beispieldaten.
2. Store-Auflösung über vorhandene öffentliche Domain-/Slug-Endpunkte und
   Laden der echten Store-Einstellungen.
3. Echte Kategorien und Produkte über öffentliche Backend-APIs; Lade-, Leer-
   und Fehlerzustände.
4. Produktdetails und Varianten, danach Warenkorb.
5. Checkout/Bestellung und Tests mit Store 121; erst danach weitere Stores.
6. Erst nach dem App-Test: Web-Deploy/Native Release und Tenant-Branding.

Jeder Schritt soll als eigener PR getestet werden. Dieser Schritt ist noch
nicht mit dem Backend verbunden; alle Produktnamen und Preise in der Vorschau
sind Beispieldaten. Lokal starten lässt sich die Vorschau aus
`mobile-flutter-poc/` mit:

```bash
flutter run -d chrome -t lib/entrypoints/main_shop.dart
```

Die CI führt den Widget-Test aus und baut zusätzlich den Shop-Web-Einstieg.
Sie stellt außerdem das Android-Artefakt `markt-ma-flutter-shop-preview-apk`
bereit. Auf dem PR in **Actions → Flutter PoC → Artifacts** herunterladen und
die APK auf dem Android-Handy installieren. Die Shop-Vorschau hat eine eigene
Android-App-ID und kann neben den vorhandenen Flutter-Apps installiert
bleiben. Es ist ein Debug-Build, kein Play-Store-Release.
