# Shop und Einladungsmodus

[Zur Übersicht](README.md)

## Gemeinsames Backend, getrennte Oberflächen

Angular und Flutter verwenden das bestehende Backend. Die Umsetzung einer Oberfläche in Angular aktualisiert die Flutter-App nicht automatisch.

## Einladungsshop

`INVITE_ONLY` kennzeichnet den Einladungsshop. Shop-Konfiguration und Kundenzugang werden im Store-Kontext verarbeitet.

Im Angular-Shop gelten:

- Produktklicks öffnen die kompakte Produktdetailseite.
- Menge und Varianten werden dort ausgewählt; auch Varianten ohne Attribute erhalten eine Auswahl.
- Mengenpreisstufen sind im Einladungsshop direkt sichtbar.
- WhatsApp ist für den Einladungsmodus ausgeblendet.
- Kategorien öffnen eine einheitliche Übersicht; Unterkategorien stammen aus den vorhandenen Kategoriebeziehungen.
- Zurück-Navigation erhält den Kategorie-Kontext.

Implementierungen:

- [Landing und Kategorien](../../../storeFrontend/src/app/features/storefront/storefront-landing.component.ts)
- [Produktdetails](../../../storeFrontend/src/app/features/storefront/storefront-product-detail.component.ts)
- [Variantenauswahl](../../../storeFrontend/src/app/features/storefront/product-variant-picker.component.ts)
- [App-Shell und Widgets](../../../storeFrontend/src/app/app.component.ts)

## Anmeldung in Flutter

Die Shop-App verwendet persistente Kundensitzungen im bestehenden Backend. Die frühere Documents-PoC-Dokumentation beschreibt diese Shop-Erweiterung noch nicht vollständig.

- [Flutter-Sitzungsverwaltung](../../../mobile-flutter-poc/lib/features/storefront/shop_session_manager.dart)
- [Backend-Sitzungsservice](../../../src/main/java/storebackend/service/CustomerAppSessionService.java)
- [Sitzungscontroller](../../../src/main/java/storebackend/controller/CustomerAppSessionController.java)

Beim Logout wird die lokale Sitzung gelöscht; die App versucht zusätzlich die serverseitige Sitzung zu widerrufen. Die genaue Laufzeit und Fehlerbehandlung sind im Sitzungsservice und in den Tests dokumentiert.
