package storebackend.enums;

/** Storefront customer-account access modes. */
public enum CustomerAccountMode {
    /** Public storefront with the existing login and self-registration flow. */
    PUBLIC_REGISTRATION,
    /** Private storefront; login is available to admin-provisioned customers only. */
    INVITE_ONLY
}
