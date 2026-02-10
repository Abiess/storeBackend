package storebackend.util;

import storebackend.entity.Store;
import storebackend.entity.User;

public class StoreAccessChecker {

    /**
     * Prüft, ob ein User der Owner eines Stores ist.
     * Behandelt null-Werte sicher.
     *
     * @param store Der Store
     * @param user Der User
     * @return true, wenn der User der Owner ist, sonst false
     */
    public static boolean isOwner(Store store, User user) {
        if (store == null || user == null) {
            return false;
        }

        if (store.getOwner() == null) {
            return false;
        }

        if (user.getId() == null || store.getOwner().getId() == null) {
            return false;
        }

        return store.getOwner().getId().equals(user.getId());
    }

    /**
     * Prüft, ob der Store einen Owner hat.
     *
     * @param store Der Store
     * @return true, wenn der Store einen Owner hat, sonst false
     */
    public static boolean hasOwner(Store store) {
        return store != null && store.getOwner() != null && store.getOwner().getId() != null;
    }
}

