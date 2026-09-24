# Persistenz & Datensicherheit

Stand: 2026-04. Diese Datei dokumentiert, wo Daten gespeichert werden,
wie sie geschützt sind und welche Konfigurationen **NICHT verändert** werden
dürfen, ohne Datenverlust zu riskieren.

---

## 1. Wo werden Daten gespeichert?

### Lokale Entwicklung (Profil: default)

| Daten                         | Speicherort                                    |
|-------------------------------|------------------------------------------------|
| Alle Entities (User, Store, Product, Category, Order, Theme, …) | H2-File-Datenbank: `./data/storedb.mv.db` |
| Hochgeladene Dateien (Bilder) | lokales Filesystem oder MinIO (deaktiviert)    |

> **Wichtig:** Der Ordner `data/` ist über `.gitignore` ausgeschlossen.
> Niemals committen – enthält echte User-Daten und Passwörter.

### Production (Profil: production)

| Daten            | Speicherort                                                   |
|------------------|---------------------------------------------------------------|
| Alle Entities    | PostgreSQL (`jdbc:postgresql://localhost:5432/storedb`)       |
| Hochgeladene Dateien | MinIO (S3-kompatibel)                                     |
| Backups          | siehe `scripts/BACKUP_SYSTEM_GUIDE.md`                        |

---

## 2. KRITISCHE Hibernate-Einstellungen

### `application.yml` (lokal)

```yaml
spring:
  datasource:
    # 'file:' = persistent | 'mem:' = NUR FÜR TESTS, weg nach Restart
    url: jdbc:h2:file:./data/storedb;...AUTO_SERVER=TRUE;DB_CLOSE_DELAY=-1
  jpa:
    hibernate:
      ddl-auto: update      # ✅ additive Schema-Updates, KEIN Datenverlust
```

### `application-production.yml` (PostgreSQL)

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: ${SPRING_JPA_HIBERNATE_DDL_AUTO:update}
```

### ❌ NIEMALS in einem Profil setzen:

| Wert            | Was passiert                                                      |
|-----------------|-------------------------------------------------------------------|
| `create`        | Schema wird beim Start neu erzeugt → **alle Daten weg**           |
| `create-drop`   | Schema wird angelegt **und beim Stop gelöscht** → **alle Daten weg** |
| `jdbc:h2:mem:`  | In-Memory-DB → bei jedem Restart **alle Daten weg**               |

---

## 3. Theme-Wechsel (User-Daten-Schutz)

`ThemeService.applyTemplateToStore()` wurde so umgebaut, dass Wechsel
zwischen Templates **niemals** User-Anpassungen verlieren:

1. Bestehende `StoreTheme`-Datensätze werden **nicht gelöscht**, sondern
   nur deaktiviert (`isActive = false`). Damit existiert eine Historie
   aller jemals genutzten Themes.
2. Vom User gesetztes **Logo** (`logoUrl`) wird ins neue Theme übernommen.
3. Vom User gesetztes **Custom-CSS** wird übernommen, sofern das Template
   kein eigenes Custom-CSS mitbringt.
4. Demo-Inhalte (`DemoContentService`) sind **idempotent**: Wenn der Store
   bereits Produkte oder Kategorien enthält, wird **nichts** ergänzt –
   echte User-Produkte werden niemals überschrieben.

---

## 4. Demo-Daten (Onboarding)

`DemoContentService.seedDemoContent(store, templateCode)`:

* schreibt Kategorien und Produkte **regulär** in die DB (gleiche Tabellen
  wie alle anderen User-Inhalte – `categories`, `products`),
* tut nichts, wenn der Store bereits Produkte oder Kategorien hat,
* läuft in einer Spring-`@Transactional`, so dass bei einem Fehler die
  gesamte Demo-Erzeugung zurückgerollt wird (kein halb-konsistenter Zustand).

Demo-Inhalte sind nach dem Anlegen für den User **nicht von echten
Produkten unterscheidbar** – er kann sie umbenennen, mit Bildern
versehen, löschen oder erweitern.

---

## 5. Backup (Production)

PostgreSQL-Backups laufen über die Skripte unter `scripts/`. Siehe
`scripts/BACKUP_SYSTEM_GUIDE.md` für Aufbau und Restore-Anleitung.

Für lokale H2-Entwicklung: Datei `data/storedb.mv.db` regelmäßig kopieren,
falls die lokale Datenbank wichtige Demo-Daten enthält. Die Datei ist
selbst-konsistent und kann einfach 1:1 weggesichert werden.

---

## 6. Checkliste vor jedem Schema-/Konfig-Change

- [ ] `ddl-auto` bleibt `update` oder `validate`?
- [ ] Datenbank-URL beginnt mit `jdbc:h2:file:` (lokal) oder `jdbc:postgresql:` (Prod)?
- [ ] Neue Spalten haben Default-Werte oder sind `nullable=true`,
      damit `update`-Migration nicht crasht?
- [ ] Falls Spalten/Tabellen entfernt werden: explizite Migration im
      `scripts/db/`-Ordner schreiben, **nicht** Hibernate löschen lassen.
- [ ] Backup vor dem Deploy vorhanden?

