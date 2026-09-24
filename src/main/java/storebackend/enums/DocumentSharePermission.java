package storebackend.enums;

/**
 * DOCUMENTS-App (Phase 1, persönlicher Dokumenten-Tresor).
 *
 * Berechtigungsstufe eines {@link storebackend.entity.DocumentShare}.
 * MVP kennt ausschließlich {@link #VIEW} (lesen + Datei öffnen, kein
 * Löschen, kein Owner-Wechsel, kein erneutes Teilen). Als Enum modelliert,
 * damit spätere Stufen (z.B. EDIT) additiv ergänzt werden können, ohne
 * Version 1 neu bauen zu müssen.
 */
public enum DocumentSharePermission {
    VIEW
}
