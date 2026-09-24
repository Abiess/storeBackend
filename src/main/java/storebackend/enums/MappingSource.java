package storebackend.enums;

/**
 * Source of product mapping suggestion.
 */
public enum MappingSource {
    /**
     * No mapping available.
     */
    NONE,
    
    /**
     * Mapping from learned association (supplier + article number).
     */
    LEARNED_MAPPING,
    
    /**
     * Manual assignment by user.
     */
    USER_ASSIGNED
}
