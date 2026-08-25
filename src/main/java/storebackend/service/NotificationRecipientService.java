package storebackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import storebackend.entity.Store;
import storebackend.entity.StoreRole;
import storebackend.entity.User;
import storebackend.repository.StoreRoleRepository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Service für die Ermittlung von Notification-Empfängern.
 * 
 * Zentrale Stelle für Multi-User-Benachrichtigungen (Owner + Team-Members).
 * Dedupliziert automatisch über User-ID.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationRecipientService {

    private final StoreRoleRepository storeRoleRepository;

    /**
     * Gibt alle User zurück, die MHD-Benachrichtigungen für einen Store erhalten sollen.
     * 
     * Empfänger:
     * - Store Owner (immer)
     * - Alle User mit Rolle "STORE_MANAGER"
     * 
     * Multi-Tenant-sicher: Nur User des angegebenen Stores werden berücksichtigt.
     * Deduplizierung: User wird nur einmal zurückgegeben, auch wenn Owner gleichzeitig Manager ist.
     * 
     * @param store Store für den die Empfänger ermittelt werden sollen
     * @return Liste von User-Objekten (dedupliziert, Owner zuerst)
     */
    public List<User> getMhdRecipients(Store store) {
        if (store == null) {
            log.warn("Store is null - returning empty recipient list");
            return List.of();
        }

        // LinkedHashMap für Deduplizierung über User-ID (behält Insertion-Order)
        Map<Long, User> recipientMap = new LinkedHashMap<>();

        // 1. Owner hinzufügen (falls vorhanden)
        User owner = store.getOwner();
        if (owner != null && owner.getId() != null) {
            recipientMap.put(owner.getId(), owner);
            log.debug("Added Owner to MHD recipients: userId={}, email={}", owner.getId(), owner.getEmail());
        } else {
            log.warn("Store {} has no Owner - no default recipient available", store.getId());
        }

        // 2. Manager hinzufügen (Multi-Tenant-sicher via storeId)
        List<StoreRole> managers = storeRoleRepository.findByStoreIdAndRole(
            store.getId(),
            "STORE_MANAGER"
        );

        log.debug("Found {} STORE_MANAGER roles for store {}", managers.size(), store.getId());

        for (StoreRole role : managers) {
            User user = role.getUser();
            
            // Null-Safety: User könnte theoretisch null sein
            if (user == null || user.getId() == null) {
                log.warn("StoreRole {} has no valid User - skipping", role.getId());
                continue;
            }

            // Deduplizierung: Wenn Owner bereits Manager ist, wird er nicht doppelt hinzugefügt
            if (!recipientMap.containsKey(user.getId())) {
                recipientMap.put(user.getId(), user);
                log.debug("Added Manager to MHD recipients: userId={}, email={}", user.getId(), user.getEmail());
            } else {
                log.debug("User {} already in recipient list (Owner = Manager) - skipping duplicate", user.getId());
            }
        }

        List<User> recipients = new ArrayList<>(recipientMap.values());
        log.info("MHD recipients for store {}: {} unique users (Owner + {} additional managers)",
                store.getId(), recipients.size(), managers.size());

        return recipients;
    }

    /**
     * Gibt alle User zurück, die Order-Benachrichtigungen für einen Store erhalten sollen.
     * 
     * Aktuell identisch mit MHD-Recipients, kann aber später erweitert werden
     * (z.B. separate Rolle "ORDER_NOTIFICATIONS" oder User-Preferences).
     * 
     * @param store Store für den die Empfänger ermittelt werden sollen
     * @return Liste von User-Objekten (dedupliziert)
     */
    public List<User> getOrderNotificationRecipients(Store store) {
        // Aktuell: Gleiche Empfänger wie MHD
        // Später optional: Separate Rolle oder Permission prüfen
        return getMhdRecipients(store);
    }
}
