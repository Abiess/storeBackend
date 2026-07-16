package storebackend.enums;

/**
 * Unterstützte Währungen
 * ISO 4217 Standard
 */
public enum CurrencyCode {
    EUR("Euro", "€"),
    MAD("Marokkanischer Dirham", "د.م."),
    USD("US-Dollar", "$"),
    GBP("Britisches Pfund", "£");

    private final String displayName;
    private final String symbol;

    CurrencyCode(String displayName, String symbol) {
        this.displayName = displayName;
        this.symbol = symbol;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getSymbol() {
        return symbol;
    }
}
