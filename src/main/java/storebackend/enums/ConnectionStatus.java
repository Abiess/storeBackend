package storebackend.enums;

/**
 * Connection Status - Status der Payment-Provider-Verbindung
 */
public enum ConnectionStatus {
    NOT_CONNECTED,      // Nicht verbunden
    PLATFORM_SANDBOX,   // Test über globales markt.ma-Sandbox-Konto
    CONNECTED,          // Offiziell verbundener Merchant-Account
    ERROR               // Verbindungsfehler
}
