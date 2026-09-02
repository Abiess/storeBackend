package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.DhlParcel;
import storebackend.entity.Store;
import storebackend.enums.DhlParcelStatus;
import storebackend.repository.DhlParcelRepository;
import storebackend.repository.DhlShelfSlotRepository;
import storebackend.entity.DhlShelfSlot;
import storebackend.exception.*;
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
    private final DhlShelfSlotRepository slotRepository;
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
     * @throws InvalidTrackingCodeException wenn Code ungültig
     */
    public String normalizeTrackingCode(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            throw new InvalidTrackingCodeException(rawCode, "Tracking code cannot be empty");
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
            throw new InvalidTrackingCodeException(rawCode, "Too short (minimum 10 characters)");
        }
        
        return normalized;
    }

    /**
     * Lagert Paket ein (Phase 2: mit Slot-Support)
     * 
     * Modi:
     * - AUTO: Backend weist nächsten freien Slot zu
     * - MANUAL: slotCode wird validiert und verwendet
     * - LEGACY: shelfLocation als Freitext (Phase 1 kompatibel)
     * 
     * @param storeId Store ID
     * @param rawTrackingCode Roher Tracking-Code vom Scanner (bereits der von DHL
     *                        bestätigte canonical pieceCode, siehe DhlController.storeParcel())
     * @param mode "auto", "manual" oder null (legacy)
     * @param slotCode Slot-Code bei mode=manual (z.B. "A3")
     * @param shelfLocation Freitext-Location bei legacy mode
     * @param notes Optionale Notizen
     * @param dhlMetadata Authoritatives DHL-Validierungsergebnis (nullable) - dessen
     *                    Metadaten-Felder (Produkt, Gewicht, Status, etc.) werden 1:1
     *                    auf das gespeicherte DhlParcel übernommen. MUSS aus der
     *                    Backend-seitigen DHL-Tracking-Validierung stammen, NIEMALS
     *                    aus vom Client mitgesendeten Werten.
     * @return Gespeichertes DhlParcel
     */
    @Transactional
    public DhlParcel storeParcel(
        Long storeId,
        String rawTrackingCode,
        String mode,
        String slotCode,
        String shelfLocation,
        String notes,
        storebackend.dto.dhl.DhlTrackingValidationResult dhlMetadata
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
            
            // Fachliche Unterscheidung nach Status
            if (existingParcel.getStatus() == DhlParcelStatus.STORED) {
                log.warn("Parcel already stored: store={}, trackingCode={}, slot={}", 
                    storeId, normalizedCode, existingParcel.getShelfLocation());
                throw new ParcelAlreadyStoredException(
                    normalizedCode,
                    existingParcel.getShelfLocation(),
                    existingParcel.getReceivedAt()
                );
            } else if (existingParcel.getStatus() == DhlParcelStatus.PICKED_UP) {
                // Bereits abgeholt - könnte theoretisch wiederverwendet werden,
                // aber vorerst verbieten wir das (siehe Requirements)
                log.warn("Tracking code already used (picked up): store={}, trackingCode={}, pickedUpAt={}", 
                    storeId, normalizedCode, existingParcel.getPickedUpAt());
                throw new ParcelAlreadyStoredException(
                    normalizedCode,
                    existingParcel.getShelfLocation(),
                    existingParcel.getReceivedAt()
                );
            }
        }
        
        // 4. Paket erstellen
        DhlParcel parcel = new DhlParcel();
        parcel.setStore(store);
        parcel.setTrackingCode(normalizedCode);
        parcel.setNotes(notes != null ? notes.trim() : null);
        parcel.setReceivedAt(java.time.LocalDateTime.now());
        parcel.setStatus(DhlParcelStatus.STORED);

        // DHL Metadaten übernehmen (nur aus der authoritativen Backend-Validierung,
        // niemals aus Client-Werten - siehe DhlController.storeParcel())
        if (dhlMetadata != null) {
            parcel.setPieceIdentifier(dhlMetadata.getPieceIdentifier());
            parcel.setShipmentStatus(dhlMetadata.getShipmentStatus());
            parcel.setStandardEventCode(dhlMetadata.getStandardEventCode());
            parcel.setProductCode(dhlMetadata.getProductCode());
            parcel.setProductName(dhlMetadata.getProductName());
            parcel.setWeightKg(dhlMetadata.getWeightKg());
            parcel.setDestinationCountry(dhlMetadata.getDestinationCountry());
            parcel.setOriginCountry(dhlMetadata.getOriginCountry());
            parcel.setLastEventTimestamp(dhlMetadata.getLastEventTimestamp());
            parcel.setPslzNumber(dhlMetadata.getPslzNumber());
        }
        
        // 5. Slot-Zuweisung basierend auf Modus
        if ("auto".equalsIgnoreCase(mode)) {
            // AUTO: Backend weist zu (race-condition-safe)
            DhlShelfSlot allocatedSlot = slotRepository.findNextFreeSlotForUpdate(storeId)
                .orElseThrow(() -> new NoFreeSlotException(storeId));
            
            parcel.setShelfSlot(allocatedSlot);
            parcel.setShelfLocation(allocatedSlot.getCode());
            
            log.info("✅ AUTO slot allocated: store={}, tracking={}, slot={}", 
                storeId, normalizedCode, allocatedSlot.getCode());
            
        } else if ("manual".equalsIgnoreCase(mode) && slotCode != null && !slotCode.isBlank()) {
            // MANUAL: Slot-Code validieren
            DhlShelfSlot selectedSlot = slotRepository.findByStoreIdAndCode(storeId, slotCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Slot not found: " + slotCode));
            
            if (!selectedSlot.getActive()) {
                throw new IllegalArgumentException("Slot is not active: " + slotCode);
            }
            
            // Prüfen ob Slot Kapazität hat (race-condition check)
            long occupiedCount = parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(
                storeId, selectedSlot.getId(), DhlParcelStatus.STORED);
            
            if (occupiedCount >= selectedSlot.getCapacity()) {
                throw new SlotFullException(
                    slotCode, 
                    selectedSlot.getCapacity(), 
                    (int) occupiedCount
                );
            }
            
            parcel.setShelfSlot(selectedSlot);
            parcel.setShelfLocation(selectedSlot.getCode());
            
            log.info("✅ MANUAL slot selected: store={}, tracking={}, slot={}", 
                storeId, normalizedCode, slotCode);
            
        } else {
            // LEGACY: Freitext (Phase 1 kompatibel)
            if (shelfLocation == null || shelfLocation.isBlank()) {
                throw new IllegalArgumentException("Shelf location is required");
            }
            parcel.setShelfLocation(shelfLocation.trim());
            parcel.setShelfSlot(null);
            
            log.info("✅ LEGACY shelf location: store={}, tracking={}, location={}", 
                storeId, normalizedCode, shelfLocation);
        }
        
        DhlParcel saved = parcelRepository.save(parcel);
        log.info("✅ Parcel stored: id={}, store={}, tracking={}, location={}", 
            saved.getId(), storeId, normalizedCode, saved.getShelfLocation());
        
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
     * @throws ParcelNotFoundException wenn Paket nicht gefunden
     * @throws ParcelAlreadyPickedUpException wenn bereits abgeholt
     */
    @Transactional
    public DhlParcel pickupParcel(Long storeId, String rawTrackingCode) {
        String normalizedCode = normalizeTrackingCode(rawTrackingCode);
        
        DhlParcel parcel = parcelRepository.findByStoreIdAndTrackingCode(storeId, normalizedCode)
            .orElseThrow(() -> new ParcelNotFoundException(normalizedCode));
        
        if (parcel.getStatus() == DhlParcelStatus.PICKED_UP) {
            log.warn("Parcel already picked up: store={}, tracking={}, pickedUpAt={}", 
                storeId, normalizedCode, parcel.getPickedUpAt());
            throw new ParcelAlreadyPickedUpException(
                normalizedCode,
                parcel.getShelfLocation(),
                parcel.getPickedUpAt()
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
     * Storniert eine fehlerhafte Paket-Einlagerung
     * 
     * Phase 3A.4 - Paket-Korrektur
     * 
     * Setzt Status auf CANCELLED, sodass:
     * - Paket nicht mehr im aktiven Lagerbestand
     * - Lagerplatz-Kapazität wieder frei
     * - Tracking-Code kann neu verwendet werden (Partial Unique Constraint)
     * - Audit-Historie bleibt erhalten
     * 
     * VALIDIERUNG:
     * - Paket muss STORED sein
     * - Multi-Tenant: nur Pakete des eigenen Stores
     * 
     * @param storeId Store ID (Multi-Tenant)
     * @param parcelId Parcel ID
     * @param cancellationReason Enum CancellationReason als String
     * @param cancellationNote Optionale Notiz
     * @param userId User ID aus Spring Security
     * @param userEmail User E-Mail aus Spring Security
     * @return DhlParcel mit Status CANCELLED
     * @throws ParcelNotFoundException wenn Paket nicht existiert
     * @throws ParcelNotStoredException wenn Paket nicht STORED ist
     * @throws ParcelAlreadyCancelledException wenn bereits CANCELLED
     */
    @Transactional
    public DhlParcel cancelParcel(
        Long storeId, 
        Long parcelId,
        String cancellationReason,
        String cancellationNote,
        Long userId,
        String userEmail
    ) {
        log.info("📋 Cancelling parcel: storeId={}, parcelId={}, reason={}, user={}", 
            storeId, parcelId, cancellationReason, userEmail);
        
        // 1. Multi-Tenant Security: Paket über storeId + parcelId laden
        DhlParcel parcel = parcelRepository.findByStoreIdAndId(storeId, parcelId)
            .orElseThrow(() -> new ParcelNotFoundException(String.valueOf(parcelId)));
        
        // 2. Fachliche Validierung: Nur STORED Pakete dürfen storniert werden
        if (parcel.getStatus() == DhlParcelStatus.CANCELLED) {
            throw new ParcelAlreadyCancelledException(parcel.getTrackingCode());
        }
        
        if (parcel.getStatus() != DhlParcelStatus.STORED) {
            throw new ParcelNotStoredException(
                parcel.getTrackingCode(),
                parcel.getStatus().name()
            );
        }
        
        // 3. Status ändern + Cancel-Metadaten speichern
        parcel.setStatus(DhlParcelStatus.CANCELLED);
        parcel.setCancelledAt(LocalDateTime.now());
        parcel.setCancellationReason(cancellationReason);
        parcel.setCancellationNote(cancellationNote);
        parcel.setCancelledByUserId(userId);
        parcel.setCancelledByEmail(userEmail);
        
        parcel = parcelRepository.save(parcel);
        
        log.info("✅ Parcel cancelled: id={}, tracking={}, slot={}, store={}", 
            parcel.getId(), parcel.getTrackingCode(), parcel.getShelfLocation(), storeId);
        
        return parcel;
    }

    /**
     * Setzt das virtuelle Lager eines Stores zurück (Teil B - Administration).
     *
     * Fachliche Bedeutung: ALLE aktuell STORED Pakete dieses Stores werden auf
     * CANCELLED gesetzt (Reason = WAREHOUSE_RESET). Die Fächer selbst (DhlShelfSlot)
     * und deren Kapazität bleiben unverändert bestehen - Occupancy zählt ohnehin
     * nur STORED Pakete und ist danach automatisch 0.
     *
     * KEIN hartes DELETE: Historie bleibt vollständig erhalten (Audit-Trail).
     * Läuft in EINER Transaktion (alle Pakete oder keines) - kein Zwischenzustand,
     * in dem z.B. nur ein Teil der Pakete storniert wäre.
     *
     * SECURITY: Multi-Tenant über storeId - betrifft ausschließlich diesen Store.
     * Admin-Berechtigung wird vom Controller (StoreAccessChecker.isStoreAdmin)
     * geprüft, BEVOR diese Methode aufgerufen wird.
     *
     * @param storeId Store ID (Multi-Tenant)
     * @param userId User ID des ausführenden Admins
     * @param userEmail E-Mail-Snapshot des ausführenden Admins
     * @return Liste der auf CANCELLED gesetzten Pakete (für Activity-Logging durch den Aufrufer)
     */
    @Transactional
    public List<DhlParcel> resetWarehouse(Long storeId, Long userId, String userEmail) {
        List<DhlParcel> storedParcels = parcelRepository.findByStoreIdAndStatus(storeId, DhlParcelStatus.STORED);

        if (storedParcels.isEmpty()) {
            log.info("ℹ️ Warehouse reset: no STORED parcels for store={}, nothing to do", storeId);
            return storedParcels;
        }

        LocalDateTime now = LocalDateTime.now();
        for (DhlParcel parcel : storedParcels) {
            parcel.setStatus(DhlParcelStatus.CANCELLED);
            parcel.setCancelledAt(now);
            parcel.setCancellationReason(storebackend.enums.CancellationReason.WAREHOUSE_RESET.name());
            parcel.setCancellationNote(null);
            parcel.setCancelledByUserId(userId);
            parcel.setCancelledByEmail(userEmail);
        }

        List<DhlParcel> saved = parcelRepository.saveAll(storedParcels);
        log.info("✅ Warehouse reset: store={}, cancelledCount={}, user={}",
            storeId, saved.size(), userEmail);

        return saved;
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
    
        /**
         * Phase 3A.5 - Zählt belegte Pakete in einem Fach
         * 
         * Für Fachverwaltung: Kapazität vs. occupiedCount
         */
        public long countStoredParcelsInSlot(Long storeId, Long slotId) {
            return parcelRepository.countByStoreIdAndShelfSlotIdAndStatus(
                storeId,
                slotId,
                DhlParcelStatus.STORED
            );
        }
    }

