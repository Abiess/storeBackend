# Marrakesch: weitere Kategorien ordnen (Phase 2)

Für Store 121 werden **bestehende Kategorien** zu vier weiteren Gruppen geordnet. Alle Kategorie-IDs, Slugs, Produkte und die vom Admin hochgeladenen Bilder bleiben erhalten. Die einzige Produktkorrektur ist Chorba-Suppe `#847`: Sie wechselt aus „Ramadan“ zu „Suppen, Brühen & Würze“.

| Oberkategorie | Unterkategorien |
| --- | --- |
| Tee & Getränke | Erfrischungsgetränke |
| Konserven & Vorrat | Fischkonserven; Oliven, Öl & Essig; Suppen, Brühen & Würze |
| Süßes & Gebäck | Ramadan-Gebäck; Honig & Amlou; Frühstück & Aufstriche |
| Kosmetik & Pflege | Seifen & Körperpflege |

Leere Importkategorien werden in Angular und Flutter im Shop nicht angezeigt. Im Admin bleiben sie für eine spätere Prüfung sichtbar. Es werden keine Kategorien gelöscht. Die zuvor angelegten vier Oberkategorien und ihre Bilder bleiben bestehen.

## Ablauf

1. PR mergen und Frontend sowie Flutter-App neu bauen/deployen.
2. Das SQL unter `curate-marrakesch-categories-02.sql` als **ganzen Block** in einem PostgreSQL-SQL-Editor ausführen. Alternativ auf der Markt-VPS:

   ```bash
   sudo -u postgres psql -d storedb -v ON_ERROR_STOP=1 -f /opt/storebackend/scripts/catalog/curate-marrakesch-categories-02.sql
   ```

3. Das Ergebnis kontrollieren:

   ```sql
   SELECT id, name, parent_id, sort_order, image_url
   FROM categories WHERE store_id = 121
     AND id IN (327,304,312,330,320,310,324,323,309,303,321,334)
   ORDER BY sort_order, id;

   SELECT id, title, category_id FROM products WHERE store_id = 121 AND id = 847;
   ```

4. In `marrakesch.markt.ma` die neuen Ober- und Unterkategorien öffnen. Den Warenkorb und eine Produktseite aus beiden Ebenen testen. In `spm.markt.ma` darf sich nichts ändern.

Das Skript prüft zuerst IDs, Slugs und die Kategorie der Chorba-Suppe. Es sichert die geänderten Felder in `marrakesch_category_backup_02` und `marrakesch_product_backup_02`. Bei Bedarf stellt `undo-marrakesch-categories-02.sql` diese Felder wieder her; danach vorgenommene Admin-Änderungen an denselben Feldern gingen dabei verloren.
