package storebackend.enums;

/**
 * Status eines rechtlichen Textes (AGB, Datenschutz, Rückgabe, Versand).
 * 
 * NOT_CONFIGURED = noch nie ausgefüllt
 * DRAFT = als Entwurf gespeichert, nicht öffentlich
 * PUBLISHED = veröffentlicht, öffentlich sichtbar
 */
public enum LegalTextStatus {
    NOT_CONFIGURED,
    DRAFT,
    PUBLISHED
}
