package storebackend.repository;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.entity.UserAppEntitlement;
import storebackend.enums.AppKey;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integrationstest für {@code UserAppEntitlement} / {@link UserAppEntitlementRepository}
 * (App-Entitlement-Konzept, Phase 1).
 *
 * WICHTIG - Grenzen dieses Tests: Die produktive H2-Testdatenbank (ddl-auto=create-drop)
 * unterstützt KEINE partiellen/gefilterten Unique-Indizes (kein "CREATE UNIQUE INDEX ...
 * WHERE ..." in H2), im Gegensatz zu PostgreSQL. Die tatsächliche Durchsetzung der
 * beiden partiellen Unique-Indizes (siehe
 * scripts/db/migrations/V025__create_user_app_entitlements.sql) kann daher NICHT
 * gegen H2 verifiziert werden. Dieser Test deckt deshalb die reine
 * Repository-/JPA-Funktionalität (ID-basierte Finder) ab; die Migrations-SQL
 * selbst (Indizes + Scope-CHECK-Constraint) wird separat in
 * {@link storebackend.migration.UserAppEntitlementMigrationSqlTest} textuell
 * gegen die tatsächliche Migrationsdatei geprüft, und produktiv durch die
 * DO-$$-Validierung am Ende der Migration (gegen echtes PostgreSQL) abgesichert.
 */
@DataJpaTest
class UserAppEntitlementRepositoryTest {

    @Autowired
    private UserAppEntitlementRepository repository;

    @Autowired
    private EntityManager entityManager;

    private User user;
    private Store storeA;
    private Store storeB;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setEmail("entitlement-test@example.com");
        user.setPasswordHash("hash");
        user.setEmailVerified(true);
        user.setPreferredLanguage("de");
        entityManager.persist(user);

        storeA = new Store();
        storeA.setOwner(user);
        storeA.setName("Store A");
        storeA.setSlug("store-a-" + System.nanoTime());
        entityManager.persist(storeA);

        storeB = new Store();
        storeB.setOwner(user);
        storeB.setName("Store B");
        storeB.setSlug("store-b-" + System.nanoTime());
        entityManager.persist(storeB);

        entityManager.flush();
    }

    private UserAppEntitlement newEntitlement(AppKey app, Store store, boolean enabled) {
        UserAppEntitlement entitlement = new UserAppEntitlement();
        entitlement.setUser(user);
        entitlement.setStore(store);
        entitlement.setApp(app);
        entitlement.setEnabled(enabled);
        return entitlement;
    }

    @Test
    @DisplayName("existsByUserId/findByUserId: User ohne Einträge liefert false/leere Liste")
    void userWithoutEntitlements_returnsFalseAndEmptyList() {
        assertThat(repository.existsByUserId(user.getId())).isFalse();
        assertThat(repository.findByUserId(user.getId())).isEmpty();
    }

    @Test
    @DisplayName("STORE-App: DHL für Store A und Store B parallel erlaubt (unterschiedliche Stores)")
    void storeApp_differentStores_bothAllowed() {
        repository.saveAndFlush(newEntitlement(AppKey.DHL, storeA, true));
        repository.saveAndFlush(newEntitlement(AppKey.DHL, storeB, true));

        assertThat(repository.existsByUserId(user.getId())).isTrue();
        assertThat(repository.findByUserId(user.getId())).hasSize(2);
        assertThat(repository.findByUserIdAndAppAndStoreId(user.getId(), AppKey.DHL, storeA.getId()))
            .isPresent();
        assertThat(repository.findByUserIdAndAppAndStoreId(user.getId(), AppKey.DHL, storeB.getId()))
            .isPresent();
    }

    @Test
    @DisplayName("GLOBAL-App: MARITIME mit store=null wird angelegt und über die Null-Store-Methode gefunden")
    void globalApp_withNullStore_isFoundViaNullStoreLookup() {
        repository.saveAndFlush(newEntitlement(AppKey.MARITIME, null, true));

        assertThat(repository.findByUserIdAndAppAndStoreIdIsNull(user.getId(), AppKey.MARITIME))
            .isPresent()
            .get()
            .satisfies(entitlement -> {
                assertThat(entitlement.getStore()).isNull();
                assertThat(entitlement.isEnabled()).isTrue();
            });
    }

}
