package storebackend.enums;

/** Storefront customer-account options. */
public enum CustomerAccountMode {
    /** Customers can sign in and create accounts themselves. */
    OPEN_REGISTRATION,
    /** Only existing or store-invited customers can sign in. */
    LOGIN_ONLY,
    /** Customer account entry points are hidden in the storefront. */
    DISABLED
}
