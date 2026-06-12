package storebackend.enums;

/**
 * Geschäftstyp eines Stores.
 * Steuert, welches Storefront-Template / welche UX angeboten wird.
 *
 * <ul>
 *   <li>{@link #SHOP}        – klassischer Online-Shop (Default, bestehendes Verhalten)</li>
 *   <li>{@link #RESTAURANT}  – Restaurant/Café: Produkte werden als Menü-Items dargestellt</li>
 *   <li>{@link #RIAD}        – Riad/Unterkunft: nutzt dasselbe Restaurant-Template (Menü/Angebote)</li>
 * </ul>
 */
public enum BusinessType {
    SHOP,
    RESTAURANT,
    RIAD
}

