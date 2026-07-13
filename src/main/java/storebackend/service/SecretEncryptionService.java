package storebackend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Secret Encryption Service
 * 
 * Verschlüsselt sensible Daten (Passwörter, API Secrets) für DB-Speicherung.
 * 
 * Algorithmus: AES-256-GCM (Authenticated Encryption with Associated Data)
 * - GCM = Galois/Counter Mode (sicher, authenticated)
 * - 256-bit Key (32 Bytes)
 * - 12-Byte IV/Nonce (zufällig pro Verschlüsselung)
 * - 128-bit Authentication Tag
 * 
 * Format: ENC(base64-encoded-data)
 * - base64-data = IV (12 bytes) + Ciphertext + Auth Tag (16 bytes)
 * 
 * Migration:
 * - Alte Klartextwerte werden beim decrypt() erkannt und durchgereicht
 * - Beim nächsten Save werden sie automatisch verschlüsselt
 * 
 * Security:
 * - NIEMALS Encryption Key loggen
 * - NIEMALS entschlüsselte Werte loggen
 * - NIEMALS Ciphertexte vollständig loggen
 * - Nur Flags loggen: encrypted=true/false
 */
@Service
@Slf4j
public class SecretEncryptionService {
    
    private static final String ENCRYPTION_PREFIX = "ENC(";
    private static final String ENCRYPTION_SUFFIX = ")";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 12 bytes = 96 bits (recommended for GCM)
    private static final int GCM_TAG_LENGTH = 128; // 128 bits = 16 bytes
    private static final int AES_KEY_SIZE = 256; // 256 bits = 32 bytes
    
    private final SecretKey secretKey;
    private final boolean encryptionEnabled;
    
    public SecretEncryptionService(
        @Value("${app.secret.encryption-key:}") String encryptionKeyBase64
    ) {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) {
            log.warn("⚠️ APP_SECRET_ENCRYPTION_KEY is not set! " +
                "Encryption is DISABLED. Secrets will be stored as plaintext. " +
                "This is ONLY acceptable in dev/test environments. " +
                "For production, you MUST set APP_SECRET_ENCRYPTION_KEY.");
            this.secretKey = null;
            this.encryptionEnabled = false;
        } else {
            try {
                byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
                if (keyBytes.length != AES_KEY_SIZE / 8) {
                    throw new IllegalArgumentException(
                        "Encryption key must be exactly 32 bytes (256 bits). " +
                        "Found: " + keyBytes.length + " bytes. " +
                        "Generate with: openssl rand -base64 32"
                    );
                }
                this.secretKey = new SecretKeySpec(keyBytes, "AES");
                this.encryptionEnabled = true;
                log.info("✅ Secret Encryption Service initialized (AES-256-GCM)");
            } catch (Exception e) {
                log.error("❌ Failed to initialize encryption key: {}", e.getMessage());
                throw new RuntimeException("Invalid encryption key configuration", e);
            }
        }
    }
    
    /**
     * Verschlüsselt einen Klartext
     * 
     * @param plaintext Klartext (z.B. Passwort, API Secret)
     * @return Verschlüsselter Wert im Format "ENC(base64...)" oder null wenn Input null
     * @throws IllegalStateException wenn Encryption Key fehlt
     */
    public String encrypt(String plaintext) {
        // null/blank durchreichen
        if (plaintext == null || plaintext.isBlank()) {
            return plaintext;
        }
        
        // Bereits verschlüsselt? Dann nicht doppelt verschlüsseln
        if (isEncrypted(plaintext)) {
            log.debug("Value already encrypted, skipping re-encryption");
            return plaintext;
        }
        
        // Encryption Key fehlt?
        if (!encryptionEnabled || secretKey == null) {
            throw new IllegalStateException(
                "Cannot encrypt: APP_SECRET_ENCRYPTION_KEY is not configured. " +
                "Refusing to store plaintext secrets. " +
                "Set APP_SECRET_ENCRYPTION_KEY in environment."
            );
        }
        
        try {
            // 1. Zufälligen IV generieren (12 bytes für GCM)
            byte[] iv = new byte[GCM_IV_LENGTH];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);
            
            // 2. Cipher initialisieren
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);
            
            // 3. Verschlüsseln (enthält automatisch Auth Tag am Ende)
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes("UTF-8"));
            
            // 4. Kombiniere: IV + Ciphertext (+ Auth Tag ist schon in ciphertext)
            byte[] combined = ByteBuffer.allocate(iv.length + ciphertext.length)
                .put(iv)
                .put(ciphertext)
                .array();
            
            // 5. Base64 encodieren und mit Prefix versehen
            String base64 = Base64.getEncoder().encodeToString(combined);
            String encrypted = ENCRYPTION_PREFIX + base64 + ENCRYPTION_SUFFIX;
            
            log.debug("Encrypted value (length: {})", encrypted.length());
            return encrypted;
            
        } catch (Exception e) {
            log.error("❌ Encryption failed: {}", e.getMessage());
            throw new RuntimeException("Failed to encrypt secret", e);
        }
    }
    
    /**
     * Entschlüsselt einen verschlüsselten Wert
     * 
     * Migration-freundlich:
     * - Wenn Wert mit "ENC(" startet → entschlüsseln
     * - Sonst → als Klartext durchreichen (alter Wert, noch nicht migriert)
     * 
     * @param encrypted Verschlüsselter Wert ("ENC(base64...)") oder Klartext
     * @return Entschlüsselter Klartext oder durchgereichten Klartext
     * @throws RuntimeException wenn Entschlüsselung fehlschlägt (corrupted data, wrong key)
     */
    public String decrypt(String encrypted) {
        // null/blank durchreichen
        if (encrypted == null || encrypted.isBlank()) {
            return encrypted;
        }
        
        // Nicht verschlüsselt? → Klartext durchreichen (Migration Mode)
        if (!isEncrypted(encrypted)) {
            log.debug("Plaintext value detected (not encrypted) - passing through for migration");
            return encrypted;
        }
        
        // Encryption Key fehlt?
        if (!encryptionEnabled || secretKey == null) {
            log.error("❌ Cannot decrypt: APP_SECRET_ENCRYPTION_KEY is not configured. " +
                "Encrypted secrets cannot be decrypted without the key.");
            throw new IllegalStateException(
                "Cannot decrypt: APP_SECRET_ENCRYPTION_KEY is not configured"
            );
        }
        
        try {
            // 1. Prefix/Suffix entfernen und Base64 decodieren
            String base64 = encrypted.substring(
                ENCRYPTION_PREFIX.length(),
                encrypted.length() - ENCRYPTION_SUFFIX.length()
            );
            byte[] combined = Base64.getDecoder().decode(base64);
            
            // 2. IV und Ciphertext trennen
            if (combined.length < GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Invalid encrypted data: too short");
            }
            
            ByteBuffer buffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buffer.get(iv);
            
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            
            // 3. Cipher initialisieren
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);
            
            // 4. Entschlüsseln (GCM verifiziert automatisch Auth Tag)
            byte[] plaintext = cipher.doFinal(ciphertext);
            
            log.debug("Decrypted value successfully");
            return new String(plaintext, "UTF-8");
            
        } catch (Exception e) {
            log.error("❌ Decryption failed: {} - Data may be corrupted or wrong key", e.getMessage());
            throw new RuntimeException("Failed to decrypt secret: " + e.getMessage(), e);
        }
    }
    
    /**
     * Prüft ob ein Wert verschlüsselt ist (hat "ENC(" Prefix)
     * 
     * @param value Wert zum Prüfen
     * @return true wenn verschlüsselt, false wenn Klartext oder null
     */
    public boolean isEncrypted(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return value.startsWith(ENCRYPTION_PREFIX) && value.endsWith(ENCRYPTION_SUFFIX);
    }
    
    /**
     * Prüft ob Encryption aktiviert ist (Key konfiguriert)
     * 
     * @return true wenn Encryption Key gesetzt ist
     */
    public boolean isEncryptionEnabled() {
        return encryptionEnabled;
    }
    
    /**
     * Generiert einen neuen Encryption Key (für Setup/Migration)
     * 
     * WICHTIG: Dieser Key muss sicher gespeichert werden!
     * Wenn der Key verloren geht, können verschlüsselte Daten nicht mehr entschlüsselt werden.
     * 
     * @return Base64-encoded 256-bit AES Key
     */
    public static String generateNewEncryptionKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
            keyGenerator.init(AES_KEY_SIZE);
            SecretKey key = keyGenerator.generateKey();
            return Base64.getEncoder().encodeToString(key.getEncoded());
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate encryption key", e);
        }
    }
}
