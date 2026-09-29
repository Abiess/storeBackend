# Marrakesch: Kategorien, Phase 1

Diese Änderung betrifft ausschließlich **Store 121**. Sie nutzt die bestehenden Kategorie-IDs und lässt Produktzuordnungen und Slugs unverändert. Im Shop werden die vier neuen Oberkategorien zuerst angezeigt; die vorhandenen Kategorien mit Produkten erscheinen weiterhin danach. Kategorie-Bilder werden mit dem Frontend ausgeliefert.

| Oberkategorie | Bestehende Unterkategorien |
| --- | --- |
| Couscous & Getreide | Mehl & Semoule |
| Datteln & Trockenfrüchte | Nüsse & Trockenfrüchte |
| Gewürze & Kräuter | Kräuter & Safran; Paprika & Gewürze |
| Basar & Küche | Teekannen & Gläser; Tajine & Tanjia |

## Anwendung nach dem Merge

1. Frontend deployen, damit die vier Bilder unter `https://markt.ma/assets/images/marrakesch/` erreichbar sind.
2. Backend-Deploy abwarten, damit das Skript nach `/opt/storebackend/scripts/catalog/` kopiert ist.
3. Auf der Markt-VPS ausführen:

   ```bash
   sudo -u postgres psql -d storedb -v ON_ERROR_STOP=1 -f /opt/storebackend/scripts/catalog/curate-marrakesch-categories-01.sql
   ```

4. Kontrollieren:

   ```sql
   SELECT id, name, parent_id, sort_order, image_url
   FROM categories WHERE store_id = 121 AND id IN (296,299,300,305,306,307,313,325,332,333)
   ORDER BY sort_order, id;
   ```

5. `https://marrakesch.markt.ma/` aufrufen, **Kategorien** öffnen und diese vier Bereiche sowie deren Unterkategorien antippen. Produkte in Ober- und Unterkategorien prüfen.

Das Skript stoppt, wenn die zehn erwarteten IDs/Slugs nicht mehr zu Store 121 passen. Es legt vor der Änderung die Tabelle `marrakesch_category_backup_01` an. Eine Rücknahme ist mit `undo-marrakesch-categories-01.sql` möglich; sie setzt auch zwischenzeitliche manuelle Änderungen an diesen Kategoriefeldern zurück.

Die übrigen Kategorien, darunter leere Importkategorien und gemischte Produktsammlungen, werden in späteren kleinen Schritten geprüft. Die separate WooCommerce-Kategoriesynchronisierung (#52) erhält bereits manuell gesetzte Namen, Eltern und Bilder dieser vorhandenen Kategorien.
