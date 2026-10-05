# Deployment und Migrationen

[Zur Übersicht](README.md)

## Deployment-Pfade

| Bereich | Workflow |
|---|---|
| Backend | [deploy.yml](../../../.github/workflows/deploy.yml) |
| Angular | [deploy-frontend.yml](../../../.github/workflows/deploy-frontend.yml) |
| Flutter Web | [deploy-flutter-web.yml](../../../.github/workflows/deploy-flutter-web.yml) |

Ein PR ist keine Veröffentlichung. Bei einem Merge müssen die Trigger des jeweiligen Workflows und anschließend dessen Ergebnis geprüft werden.

## SQL-Migrationen

Der aktive [Deployment-Script](../../../scripts/deploy.sh) sucht `V*.sql` unter `scripts/db/migrations/` und sortiert die Dateien nach Namen. Er führt diese Dateien bei jedem entsprechenden Deployment erneut aus.

- Migrationen in diesen Ordner legen.
- Führende Nullen in der Versionsnummer verwenden.
- SQL mehrfach ausführbar gestalten, etwa mit `IF NOT EXISTS`.
- Regeln im [Migrations-README](../../../scripts/db/migrations/README.md) beachten.
- Nicht annehmen, dass eine Datei in einem anderen Migrationsordner von diesem Script ausgeführt wird.

Das Script setzt `ON_ERROR_STOP=1` pro SQL-Datei. Nach Migrationsfehlern kann es laut Implementierung trotzdem mit dem App-Start fortfahren. Deshalb auch bei erfolgreichem Deployment die Migrationsmeldungen kontrollieren.

## Bekannte Schema-Erweiterungen

- [V029](../../../scripts/db/migrations/V029__add_store_whatsapp_button_enabled.sql): WhatsApp-Schalter am Store.
- [V030](../../../scripts/db/migrations/V030__create_customer_app_sessions.sql): persistente Kunden-App-Sitzungen.

Read-only-Prüfung für V030:

```sql
SELECT to_regclass('public.customer_app_sessions');
```

Prüfung der WhatsApp-Spalte:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'stores'
  AND column_name = 'whatsapp_button_enabled';
```

## Bestellung nach Checkout nicht auffindbar

Bei erfolgreichem Checkout und anschließendem 404 zunächst die tatsächliche Speicherung prüfen:

```sql
SELECT id, order_number, store_id, customer_id, status, created_at
FROM public.orders
WHERE order_number = 'ORD-BEISPIEL';
```

Datenbank-Ergebnis, Store-ID, angemeldeten Kunden und Backend-Log gemeinsam prüfen. Eine fehlgeschlagene Anzeige allein beweist nicht, dass die Bestellung nicht gespeichert wurde.
