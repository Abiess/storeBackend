package storebackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import storebackend.dto.StoreRoleDTO;
import storebackend.dto.StoreRoleRequest;
import storebackend.entity.Store;
import storebackend.entity.StoreRole;
import storebackend.entity.User;
import storebackend.repository.StoreRepository;
import storebackend.repository.StoreRoleRepository;
import storebackend.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StoreRoleService {

    private final StoreRoleRepository storeRoleRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;

    /** Alle Rollen eines Stores abrufen */
    public List<StoreRoleDTO> getRolesForStore(Long storeId) {
        return storeRoleRepository.findByStoreId(storeId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /** Neue Rolle hinzufügen */
    @Transactional
    public StoreRoleDTO addRole(Long storeId, StoreRoleRequest req) {
        Store store = storeRepository.findById(storeId)
                .orElseThrow(() -> new RuntimeException("Store not found: " + storeId));
        User user = userRepository.findById(req.userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + req.userId));

        // Prüfen ob bereits eine Rolle existiert → Update
        StoreRole existing = storeRoleRepository
                .findByStoreIdAndUserId(storeId, req.userId)
                .orElse(null);

        if (existing != null) {
            existing.setRole(req.role != null ? req.role : existing.getRole());
            if (req.permissions != null) existing.setPermissionList(req.permissions);
            return toDTO(storeRoleRepository.save(existing));
        }

        StoreRole role = new StoreRole();
        role.setStore(store);
        role.setUser(user);
        role.setRole(req.role != null ? req.role : "STORE_STAFF");
        if (req.permissions != null) role.setPermissionList(req.permissions);

        return toDTO(storeRoleRepository.save(role));
    }

    /** Rolle aktualisieren */
    @Transactional
    public StoreRoleDTO updateRole(Long storeId, Long userId, StoreRoleRequest req) {
        StoreRole existing = storeRoleRepository
                .findByStoreIdAndUserId(storeId, userId)
                .orElseThrow(() -> new RuntimeException("Role not found for store " + storeId + " and user " + userId));

        if (req.role != null) existing.setRole(req.role);
        if (req.permissions != null) existing.setPermissionList(req.permissions);

        return toDTO(storeRoleRepository.save(existing));
    }

    /** Rolle löschen */
    @Transactional
    public void removeRole(Long storeId, Long userId) {
        storeRoleRepository.deleteByStoreIdAndUserId(storeId, userId);
    }

    /** Entity → DTO */
    private StoreRoleDTO toDTO(StoreRole r) {
        StoreRoleDTO dto = new StoreRoleDTO();
        dto.id = r.getId();
        dto.userId = r.getUser().getId();
        dto.userEmail = r.getUser().getEmail();
        dto.userName = r.getUser().getName();
        dto.storeId = r.getStore().getId();
        dto.role = r.getRole();
        dto.permissions = r.getPermissionList();
        dto.createdAt = r.getCreatedAt();
        dto.updatedAt = r.getUpdatedAt();
        return dto;
    }
}

