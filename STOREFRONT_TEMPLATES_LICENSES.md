# Storefront Templates – Lizenz-Übersicht

Alle aktuell im System integrierten Storefront-Layout-Templates und ihre
Lizenz-Quellen. Stand: 2026-04.

## Übersicht

| Template-Code        | Anzeigename         | Branche / Use-Case          | Layout-Komponente                          | Quelle / Inspiration                                | Lizenz             | Attribution |
|----------------------|---------------------|------------------------------|--------------------------------------------|------------------------------------------------------|--------------------|-------------|
| `MODERN_GRID`        | Modern Grid         | Allgemein (Default)          | `app-store-layout`                         | Eigenbau                                             | MIT (intern)       | nein        |
| `CLASSIC_BOOTSTRAP`  | Classic Shop        | Allgemein / Foodstore        | `app-classic-shop-layout`                  | [Start Bootstrap "Shop Homepage"](https://startbootstrap.com/template/shop-homepage) | **MIT**            | nein        |
| `MINIMAL_DARK`       | Minimal Dark        | Mode / Design                | `app-store-layout` + dark CSS-Vars         | Eigenbau                                             | MIT (intern)       | nein        |
| `ELECTRONICS_PRO`    | Electronics Pro     | Elektronik                   | `app-electronics-pro-layout`               | [Start Bootstrap "Modern Business"](https://startbootstrap.com/template/modern-business) | **MIT**            | nein        |
| `FASHION_EDITORIAL`  | Fashion Editorial   | Mode / Editorial             | `app-fashion-editorial-layout`             | [HTML5UP "Editorial"](https://html5up.net/editorial) | **CC-BY 3.0**      | **JA** – automatisch im Footer der Layout-Komponente |
| `BEAUTY_SOFT`        | Beauty Soft         | Kosmetik / Wellness          | `app-store-layout` (Reuse)                 | Eigenbau (Pastell-Palette)                           | MIT (intern)       | nein        |
| `RESTAURANT_WARM`    | Restaurant Warm     | Restaurant / Food            | `app-classic-shop-layout` (Reuse)          | Eigenbau (Erdton-Palette)                            | MIT (intern)       | nein        |

## Hinweise

- **MIT** und Eigenbau-Templates können ohne weitere Anforderungen kommerziell
  in jedem Tenant-Store eingesetzt werden. Keine Footer-Pflicht.
- **CC-BY 3.0** (HTML5UP) erlaubt kommerzielle Nutzung mit Pflicht-Attribution
  des Designers. Diese Attribution wird in der entsprechenden Layout-Komponente
  (`fashion-editorial-layout.component.ts`, `.editorial-credit`) automatisch
  gerendert. Sie darf **nicht entfernt** werden, sonst verletzt der Store die
  Lizenz.
- **Apache 2.0** – derzeit keine Templates dieser Lizenz integriert.

## Erweiterung um neue Templates

1. Lizenz prüfen – nur MIT, Apache, BSD oder CC-BY 3.0 (mit Footer-Credit) zulassen.
2. Eintrag in `ThemeTemplateSeeder.java` hinzufügen (eindeutiger `code`).
3. Bei Bedarf neue Layout-Komponente in
   `storeFrontend/src/app/features/storefront/components/` anlegen und
   im `@switch` der `storefront.component.html` registrieren.
4. Vorschau-SVG unter `storeFrontend/src/assets/themes/` ablegen.
5. **Optional:** Branchen-Demo-Katalog für das neue Template in
   `DemoContentService.CATALOGS` ergänzen, damit der Onboarding-Endpoint
   passende Beispiel-Kategorien & -Produkte erzeugen kann.
6. Diese Tabelle aktualisieren.

## Onboarding-Flow

Direkt nach `POST /api/me/stores` (Store anlegen) navigiert der Wizard
zu `/stores/:id/onboarding`. Dort wählt der User ein Template per
1-Klick-Karte und entscheidet, ob branchenpassende Demo-Daten
mitangelegt werden sollen. Backend-Endpoint:

```
POST /api/themes/store/{storeId}/onboard
     ?templateCode=ELECTRONICS_PRO
     &withDemoData=true
```

Antwort enthält `theme`, `templateName`, `templateCode` und
`demoProductsCreated`. Das Seeden ist **idempotent** – wenn der Store
schon Produkte oder Kategorien hat, werden keine Demo-Daten ergänzt
(echte Daten werden niemals überschrieben).

## Quellen-Whitelist (vom Product Owner freigegeben)

- Tabler – https://tabler.io – MIT
- Start Bootstrap – https://startbootstrap.com – MIT
- AdminLTE – https://adminlte.io – MIT
- Creative Tim (Free-Themes) – https://www.creative-tim.com – MIT (jeweils prüfen)
- HTML5UP – https://html5up.net – CC-BY 3.0 (Footer-Credit Pflicht)
- Colorlib (Free-Themes) – https://colorlib.com – CC-BY 3.0 (Footer-Credit Pflicht, jeweils prüfen)
- ThemeWagon (Free-Themes) – https://themewagon.com – meist MIT, **jeweils prüfen**
- GitHub Open-Source – jeweils MIT/Apache/BSD bevorzugen, prüfen

