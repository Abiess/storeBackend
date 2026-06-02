# markt.ma – Marketplace Research Agent 🇲🇦

Ein legaler, ethisch entwickelter Lead-Generator für Marokko.  
Sammelt **ausschließlich öffentlich sichtbare** Geschäftsinformationen von Händlern auf Avito.ma, OpenSooq, Jumia.ma und Instagram Business Pages.

---

## ⚖️ Rechtliche Grundlage

| Prinzip | Umsetzung |
|---|---|
| Nur öffentliche Daten | Kein Login, keine Authentifizierung, keine privaten Profile |
| robots.txt respektiert | Automatische Prüfung vor jedem Request |
| Rate Limiting | 2.5–4 Sek. Pause zwischen Requests |
| Retry mit Backoff | Max. 3 Versuche, dann Überspringen |
| Kein persönliches Scraping | Nur Geschäftsprofile / gewerbliche Anzeigen |
| DSGVO / loi 09-08 Marokko | Nur Daten die Händler freiwillig öffentlich machen |

---

## 🏆 Lead-Scoring (0–100 Punkte)

| Kriterium | Max. Punkte | Beschreibung |
|---|---|---|
| **Produktanzahl** | 25 | ≥100=25, ≥50=22, ≥20=18, ≥10=14, ≥5=10 |
| **Aktivität** | 25 | Heute=25, ≤7 Tage=22, ≤30 Tage=18, ≤90 Tage=13 |
| **Branding** | 20 | Profilbild+7, Beschreibung+5, echter Name+4, etabliert+4 |
| **Social Media** | 15 | Instagram+5(+4 bei ≥1K/≥5K), Facebook+3, WhatsApp+3, TikTok+2 |
| **Keine eigene Website** | 15 | Kein Shop=15, nur Social-Link=10, echter Shop=0 |

### Kategorien:
- 🔥 **HOT** (80–100): Sofort anrufen – innerhalb von 24 Stunden
- ☀️ **WARM** (60–79): In 48 Stunden per WhatsApp kontaktieren
- 🌤️ **MEDIUM** (40–59): E-Mail-Kampagne diese Woche
- ❄️ **COLD** (0–39): Monatlichen Newsletter

---

## 🚀 Installation & Start

```powershell
cd research-agent
npm install

# Demo-Modus (empfohlen zum Testen, keine HTTP-Requests):
node main.js --demo

# Alle Quellen live:
node main.js

# Nur Avito, Casablanca, Kategorie Mode, ab Score 60:
node main.js --source avito --city casablanca --category mode --min-score 60

# Nur Instagram-Handles analysieren:
node main.js --source instagram --handles "@boutique_fatima,@shop_maroc"

# Jumia, max. 5 Seiten, Ausgabe in eigenes Verzeichnis:
node main.js --source jumia --pages 5 --output ./meine-leads
```

---

## 📂 Ausgabe

Die CSV-Datei wird in `output/` gespeichert:  
`markt-ma-leads_2026-06-02T17-00-00.csv`

### CSV-Spalten:
`Status | Lead-Kategorie | Score | Quelle | Händlername | Stadt | Telefon | WhatsApp | Produktanzahl | Letzte Aktivität | Eigene Website? | Instagram | Follower | Facebook | TikTok | WhatsApp Business | Score-Details | Empfohlene Aktion | ...`

---

## 🔧 CLI-Parameter

| Parameter | Beschreibung | Beispiel |
|---|---|---|
| `--source` | Quelle: `all` / `avito` / `opensooq` / `jumia` / `instagram` | `--source avito` |
| `--demo` | Demo-Modus (keine HTTP-Requests) | `--demo` |
| `--city` | Stadt filtern | `--city casablanca` |
| `--category` | Kategorie | `--category mode` |
| `--pages` | Max. Seiten pro Quelle (Standard: 3) | `--pages 5` |
| `--handles` | Instagram-Handles (kommagetrennt) | `--handles "@shop1,@shop2"` |
| `--min-score` | Mindest-Score für Export | `--min-score 60` |
| `--keywords` | Suchbegriffe | `--keywords "artisanat maroc"` |
| `--output` | Ausgabeverzeichnis | `--output ./leads` |

---

## 📁 Projektstruktur

```
research-agent/
├── main.js                    # Orchestrierung & CLI
├── package.json
├── models/
│   ├── lead.js                # Lead-Datenmodell
│   └── demo-data.js           # Realistische Beispieldaten
├── scrapers/
│   ├── base-scraper.js        # Rate-Limiting, robots.txt, HTTP
│   ├── avito-scraper.js       # Avito.ma
│   ├── opensooq-scraper.js    # OpenSooq.com (Marokko)
│   ├── jumia-scraper.js       # Jumia.ma
│   └── instagram-scraper.js   # Öffentliche Instagram Business Pages
├── scoring/
│   └── lead-scorer.js         # 5-Kriterien Scoring-System
├── export/
│   └── csv-exporter.js        # CSV mit UTF-8 BOM (Excel-kompatibel)
└── output/                    # Generierte CSVs
```

---

## ⚠️ Hinweise

- **Avito/OpenSooq/Jumia** können ihre HTML-Struktur ändern → Selektoren ggf. anpassen
- **Instagram** blockiert direkte HTTP-Requests stark → für Produktion: [Instagram Graph API](https://developers.facebook.com/docs/instagram-api) nutzen
- Rate Limiting ist aktiv – ein vollständiger Scan dauert 10–30 Minuten
- Die Daten dürfen nur intern für Vertriebszwecke (markt.ma Akquise) genutzt werden

