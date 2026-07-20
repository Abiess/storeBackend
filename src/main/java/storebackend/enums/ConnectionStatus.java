package storebackend.enums;

/**
 * Connection Status - Status der Payment-Provider-Verbindung
 */
public enum ConnectionStatus {
    NOT_CONNECTED,  // Nicht verbunden
    CONNECTED,      // Verbunden und funktionsfähig
    ERROR           // Verbindungsfehler
}
