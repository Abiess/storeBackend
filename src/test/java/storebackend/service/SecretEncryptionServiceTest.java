package storebackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit Tests für SecretEncryptionService
 */
class SecretEncryptionServiceTest {
    
    private SecretEncryptionService service;
    private String testEncryptionKey;
    
    @BeforeEach
    void setUp() {
        // Generiere einen Test-Key (256-bit Base64)
        testEncryptionKey = SecretEncryptionService.generateNewEncryptionKey();
        service = new SecretEncryptionService(testEncryptionKey);
    }
    
    @Test
    void testEncryptDecryptRoundtrip() {
        String plaintext = "MySecretPassword123!";
        
        String encrypted = service.encrypt(plaintext);
        String decrypted = service.decrypt(encrypted);
        
        assertEquals(plaintext, decrypted);
    }
    
    @Test
    void testEncryptProducesDifferentCiphertexts() {
        String plaintext = "SamePassword";
        
        String encrypted1 = service.encrypt(plaintext);
        String encrypted2 = service.encrypt(plaintext);
        
        // Gleicher Plaintext → unterschiedliche Ciphertexte (wegen zufälligem IV)
        assertNotEquals(encrypted1, encrypted2);
        
        // Aber beide entschlüsseln zum gleichen Plaintext
        assertEquals(plaintext, service.decrypt(encrypted1));
        assertEquals(plaintext, service.decrypt(encrypted2));
    }
    
    @Test
    void testEncryptAlreadyEncryptedValueDoesNotDoubleEncrypt() {
        String plaintext = "MyPassword";
        
        String encrypted = service.encrypt(plaintext);
        assertTrue(encrypted.startsWith("ENC("));
        
        // Nochmal encrypt → sollte unverändert bleiben
        String doubleEncrypted = service.encrypt(encrypted);
        assertEquals(encrypted, doubleEncrypted);
    }
    
    @Test
    void testDecryptPlaintextReturnsPlaintext() {
        // Migration Mode: Alte Klartextwerte durchreichen
        String plaintext = "OldUnencryptedPassword";
        
        String result = service.decrypt(plaintext);
        
        assertEquals(plaintext, result);
    }
    
    @Test
    void testEncryptNull() {
        assertNull(service.encrypt(null));
    }
    
    @Test
    void testEncryptBlank() {
        String blank = "   ";
        assertEquals(blank, service.encrypt(blank));
    }
    
    @Test
    void testDecryptNull() {
        assertNull(service.decrypt(null));
    }
    
    @Test
    void testDecryptBlank() {
        String blank = "   ";
        assertEquals(blank, service.decrypt(blank));
    }
    
    @Test
    void testIsEncrypted() {
        String plaintext = "NotEncrypted";
        String encrypted = service.encrypt(plaintext);
        
        assertFalse(service.isEncrypted(plaintext));
        assertTrue(service.isEncrypted(encrypted));
        assertFalse(service.isEncrypted(null));
        assertFalse(service.isEncrypted(""));
    }
    
    @Test
    void testDecryptInvalidFormat() {
        String invalid = "ENC(corrupted-base64-data)";
        
        assertThrows(RuntimeException.class, () -> service.decrypt(invalid));
    }
    
    @Test
    void testDecryptWrongKey() {
        String plaintext = "SecretData";
        
        // Verschlüsseln mit einem Key
        String encrypted = service.encrypt(plaintext);
        
        // Versuchen zu entschlüsseln mit anderem Key
        String otherKey = SecretEncryptionService.generateNewEncryptionKey();
        SecretEncryptionService otherService = new SecretEncryptionService(otherKey);
        
        // Sollte fehlschlagen (wrong key → authentication failure)
        assertThrows(RuntimeException.class, () -> otherService.decrypt(encrypted));
    }
    
    @Test
    void testEncryptionDisabledWhenNoKey() {
        SecretEncryptionService disabledService = new SecretEncryptionService("");
        
        assertFalse(disabledService.isEncryptionEnabled());
        
        // encrypt() sollte Exception werfen wenn Key fehlt
        assertThrows(IllegalStateException.class, () -> disabledService.encrypt("secret"));
    }
    
    @Test
    void testDecryptionFailsWhenNoKey() {
        // Verschlüsseln mit gültigem Key
        String plaintext = "SecretData";
        String encrypted = service.encrypt(plaintext);
        
        // Service ohne Key
        SecretEncryptionService disabledService = new SecretEncryptionService("");
        
        // decrypt() auf verschlüsselten Wert sollte Exception werfen wenn Key fehlt
        assertThrows(IllegalStateException.class, () -> disabledService.decrypt(encrypted));
    }
    
    @Test
    void testEncryptedValueHasCorrectFormat() {
        String plaintext = "TestPassword";
        String encrypted = service.encrypt(plaintext);
        
        assertTrue(encrypted.startsWith("ENC("));
        assertTrue(encrypted.endsWith(")"));
        assertTrue(encrypted.length() > 10); // mindestens IV + Ciphertext + Tag
    }
    
    @Test
    void testGenerateNewEncryptionKey() {
        String key1 = SecretEncryptionService.generateNewEncryptionKey();
        String key2 = SecretEncryptionService.generateNewEncryptionKey();
        
        // Keys sollten Base64 sein
        assertNotNull(key1);
        assertNotNull(key2);
        assertTrue(key1.length() > 20);
        
        // Keys sollten unterschiedlich sein
        assertNotEquals(key1, key2);
        
        // Keys sollten verwendbar sein
        SecretEncryptionService testService = new SecretEncryptionService(key1);
        assertTrue(testService.isEncryptionEnabled());
    }
    
    @Test
    void testLongPlaintext() {
        // Test mit längerem Text
        String plaintext = "This is a very long secret password with special characters: !@#$%^&*()_+-=[]{}|;:',.<>?/~`";
        
        String encrypted = service.encrypt(plaintext);
        String decrypted = service.decrypt(encrypted);
        
        assertEquals(plaintext, decrypted);
    }
    
    @Test
    void testUnicodeCharacters() {
        // Test mit Unicode-Zeichen
        String plaintext = "Passwort mit Umlauten: äöüßÄÖÜ und Emoji: 🔐🔑";
        
        String encrypted = service.encrypt(plaintext);
        String decrypted = service.decrypt(encrypted);
        
        assertEquals(plaintext, decrypted);
    }
}
