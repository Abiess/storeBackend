package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.StoreRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * DHL Parcel Service
 * 
 * Business Logic für DHL-Paket-Verwaltung:
 * - Tracking-Code-Normalisierung
 * - Paket einlagern
 * - Paket suchen
 * - Paket abholen
 * - Multi-Tenant Validierung
 * 
 * PHASE 1:
 * - KEIN DHL API Call
 * - KEINE externe Tracking-Abfrage
 * - KEINE automatische Status-Updates
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DhlParcelService {
    
    private final DhlParcelRepository parcelRepository;
    private final StoreRepository storeRepository;

    /**
     * Normalisiert DHL Tracking-Code
     * 
     * Input-Varianten:
     * - (J)VGL0605379700518040
     * - JVGL 0605 3797 0051 8040
     * - jvgl0605379700518040
     * 
     * Output:
     * - JVGL0605379700518040
     * 
     * Regeln:
     * 1. trim()
     * 2. uppercase
     * 3. Leerzeichen entfernen
     * 4. führendes (J) entfernen falls vorhanden
     * 5. nur alphanumerische Zeichen behalten
     * 
     * @param rawCode Roher Tracking-Code vom Scanner/Input
     * @return Normalisierter Code
     */
    public String normalizeTrackingCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new IllegalArgumentException("Tracking code cannot be empty");
        }
        
        // 1. trim + uppercase
        String normalized = rawCode.trim().toUpperCase();
        
        // 2. Leerzeichen entfernen
        normalized = normalized.replaceAll("\\s+", "");
        
        // 3. Führendes (J) entfernen falls vorhanden
        if (normalized.startsWith("(J)")) {
            normalized = "J" + normalized.substring(3);
        }
        
        // 4. Nur alphanumerische Zeichen behalten
        normalized = normalized.replaceAll("[^A-Z0-9]", "");
        
        log.debug("Tracking code normalized: '{}' -> '{}'", rawCode, normalized);
        
        if (normalized.length() < 10) {
            throw new IllegalArgumentException("Invalid tracking code format: too short");
        }
        
        return normalized;
    }

    /**
     * Lagert Paket ein
     * 
     * Validiert:
     * - Store existiert
     * - Tracking-Code normalisiert
     * - Keine Dublette vorhanden (store + trackingCode unique)
     * 
     * @param storeId Store ID
     * @param rawTrackingCode Roher Tracking-Code vom Scanner
     * @param shelfLocation Lagerplatz (z.B. "Regal B-12")
     * @param notes Optionale Notizen
     * @return Gespeichertes DhlParcel
     * @throws IllegalArgumentException wenn Store nicht existiert oder Dublette
     */
    @Transactional
    public DhlParcel storeParcel(
        Long storeId,
        String rawTrackingCode,
        String shelfLocation,
        String notes
    ) {
        // 1. Store validieren
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Store not found: " + storeId));
        
        // 2. Tracking-Code normalisieren
        String normalizedCode = normalizeTrackingCode(rawTrackingCode);
        
        // 3. Dublette prüfen
        Optional<DhlParcel> existing = parcelRepository.findByStoreIdAndTrackingCode(storeId, normalizedCode);
        if (existing.isPresent()) {
            DhlParcel existingParcel = existing.get();
            log.warn("Parcel already exists: store={}, trackingCode={}, status={}", 
                storeId, normalizedCode, existingParcel.getStatus());
            throw new IllegalArgumentException(
                "Parcel already exists with status: " + existingParcel.getStatus()
            );
        }
        
        // 4. Neues Paket erstellen
        DhlParcel parcel = new DhlParcel();
        parcel.setStore(store);
        parcel.setTrackingCode(normalizedCode);
        parcel.setShelfLocation(shelfLocation.trim());
        parcel.setNotes(notes != null ? notes.trim() : null);
        parcel.setReceivedAt(LocalDateTime.now());
        parcel.setStatus(DhlParcelStatus.STORED);
        
        DhlParcel saved = parcelRepository.save(parcel);
        log.info("✅ Parcel stored: id={}, store={}, tracking={}, location={}", 
            saved.getId(), storeId, normalizedCode, shelfLocation);
        
        return saved;
    }

    /**
     * Sucht Paket anhand Tracking-Code
     * 
     * MULTI-TENANT:
     * - Nur innerhalb des angegebenen Stores
     * - Keine store-übergreifende Suche
     * 
     * @param storeId Store ID
     * @param rawTrackingCode Roher Tracking-Code (wird normalisiert)
     * @return Optional<DhlParcel>
     */
    @Transactional(readOnly = true)
    public Optional<DhlParcel> findParcel(Long storeId, String rawTrackingCode) {
        String normalizedCode = normalizeTrackingCode(rawTrackingCode);
        return parcelRepository.findByStoreIdAndTrackingCode(storeId, normalizedCode);
    }

    /**
     * Holt Paket ab (markiert als PICKED_UP)
     * 
     * @param storeId Store ID (Multi-Tenant Validierung)
     * @param rawTrackingCode Roher Tracking-Code
     * @return Updated DhlParcel
     * @throws IllegalArgumentException wenn Paket nicht gefunden oder bereits abgeholt
     */
    @Transactional
    public DhlParcel pickupParcel(Long storeId, String rawTrackingCode) {
        String normalizedCode = normalizeTrackingCode(rawTrackingCode);
        
        DhlParcel parcel = parcelRepository.findByStoreIdAndTrackingCode(storeId, normalizedCode)
            .orElseThrow(() -> new IllegalArgumentException(
                "Parcel not found: " + normalizedCode
            ));
        
        if (parcel.getStatus() == DhlParcelStatus.PICKED_UP) {
            log.warn("Parcel already picked up: store={}, tracking={}, pickedUpAt={}", 
                storeId, normalizedCode, parcel.getPickedUpAt());
            throw new IllegalArgumentException(
                "Parcel already picked up on: " + parcel.getPickedUpAt()
            );
        }
        
        parcel.setStatus(DhlParcelStatus.PICKED_UP);
        parcel.setPickedUpAt(LocalDateTime.now());
        
        DhlParcel updated = parcelRepository.save(parcel);
        log.info("✅ Parcel picked up: id={}, store={}, tracking={}", 
            updated.getId(), storeId, normalizedCode);
        
        return updated;
    }

    /**
     * Listet aktive (eingelagerte) Pakete
     * 
     * @param storeId Store ID
     * @return List<DhlParcel>
     */
    @Transactional(readOnly = true)
    public List<DhlParcel> listStoredParcels(Long storeId) {
        return parcelRepository.findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED);
    }

    /**
     * Listet alle Pakete (alle Status)
     * 
     * @param storeId Store ID
     * @return List<DhlParcel>
     */
    @Transactional(readOnly = true)
    public List<DhlParcel> listAllParcels(Long storeId) {
        return parcelRepository.findByStoreId(storeId);
    }

    /**
     * Zählt aktive Pakete
     * 
     * @param storeId Store ID
     * @return Anzahl eingelagerter Pakete
     */
    @Transactional(readOnly = true)
    public long countStoredParcels(Long storeId) {
        return parcelRepository.countByStoreIdAndStatus(storeId, DhlParcelStatus.STORED);
    }
}
