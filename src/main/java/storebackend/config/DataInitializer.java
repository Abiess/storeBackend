package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Domain;
import storebackend.entity.Plan;
import storebackend.entity.Store;
import storebackend.entity.User;
import storebackend.enums.DomainType;
import storebackend.enums.Role;
import storebackend.enums.StoreStatus;
import storebackend.repository.DomainRepository;
import storebackend.repository.PlanRepository;
import storebackend.repository.StoreRepository;
import storebackend.repository.UserRepository;

import java.util.List;
import java.util.Set;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final PlanRepository planRepository;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final DomainRepository domainRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;
    private final JdbcTemplate jdbcTemplate;

  @EventListener(ContextRefreshedEvent.class)
    public void initializeData() {
        log.info("Starting data initialization...");

        try {
            // REGRESSION-FIX (Loyalty-MVP): NOT-NULL-Spalten reparieren, die
            // Hibernate ddl-auto=update auf der befüllten stores-Tabelle nicht
            // anlegen konnte (siehe V016__add_loyalty_store_settings.sql).
            // Muss VOR allen anderen Store-Zugriffen laufen.
            repairLoyaltyStoreColumns();

            // Plan-Initialisierung (lokal und production)
            initializePlans();

            // Testdaten nur lokal anlegen
            if (isLocalDevelopment()) {
                initializeTestData();
            }

            log.info("Data initialization completed - Application is ready!");
        } catch (Exception e) {
            log.error("Failed to initialize data: {}", e.getMessage());
            log.warn("This is normal on first deployment when tables are being created.");
            log.warn("The application will work after tables are created and service is restarted.");
        }
    }

    /**
     * Regression-Fix für den Loyalty-Store-Settings-Bug:
     *
     * Hibernate ddl-auto=update kann "ALTER TABLE stores ADD COLUMN ... NOT NULL"
     * auf einer bereits befüllten Tabelle nicht ausführen (Postgres/H2 verweigern
     * NOT-NULL-Spalten ohne Default bei existierenden Zeilen). Ohne diesen Fix
     * fehlen die Spalten dauerhaft und JEDE Hibernate-Query auf Store schlägt fehl
     * (u.a. StoreAccessChecker -> fälschlich 403 auf bestehenden Endpoints).
     *
     * Diese Methode ist bewusst NICHT über Flyway umgesetzt, da Flyway in diesem
     * Projekt aktuell nicht aktiviert ist (siehe V016__add_loyalty_store_settings.sql
     * für die äquivalente, dokumentierte SQL-Migration für eine spätere Flyway-Nutzung).
     *
     * Idempotent: ADD COLUMN IF NOT EXISTS, UPDATE nur WHERE ... IS NULL (keine
     * bestehenden Werte werden überschrieben), SET DEFAULT/SET NOT NULL sind
     * beliebig oft wiederholbar. Läuft bei jedem Start, ist ein No-Op sobald
     * die Spalten korrekt angelegt sind.
     */
    private void repairLoyaltyStoreColumns() {
        repairNotNullColumn("loyalty_enabled", "BOOLEAN", "FALSE");
        repairNotNullColumn("loyalty_amount_step", "NUMERIC(15,2)", "10.00");
        repairNotNullColumn("loyalty_points_per_step", "INTEGER", "1");
    }

    private void repairNotNullColumn(String column, String sqlType, String defaultLiteral) {
        try {
            jdbcTemplate.execute("ALTER TABLE stores ADD COLUMN IF NOT EXISTS " + column + " " + sqlType);
            jdbcTemplate.update("UPDATE stores SET " + column + " = " + defaultLiteral + " WHERE " + column + " IS NULL");
            jdbcTemplate.execute("ALTER TABLE stores ALTER COLUMN " + column + " SET DEFAULT " + defaultLiteral);
            jdbcTemplate.execute("ALTER TABLE stores ALTER COLUMN " + column + " SET NOT NULL");
            log.info("[SCHEMA-REPAIR] stores.{} OK (default={})", column, defaultLiteral);
        } catch (Exception e) {
            // Nicht fatal: Loggen und weitermachen (z.B. wenn Tabelle "stores" beim
            // allerersten Deployment noch gar nicht existiert).
            log.warn("[SCHEMA-REPAIR] Could not repair column stores.{}: {}", column, e.getMessage());
        }
    }

    private boolean isLocalDevelopment() {
        String datasourceUrl = environment.getProperty("spring.datasource.url", "");
        return datasourceUrl.contains("h2:mem");
    }

    @Transactional
    protected void initializePlans() {
        try {
            if (planRepository.count() > 0) {
                log.info("Plans already initialized");
                return;
            }
        } catch (Exception e) {
            log.warn("Cannot check plan count - tables may not exist yet: {}", e.getMessage());
            return;
        }

        // FREE Plan
        Plan freePlan = new Plan();
        freePlan.setName("FREE");
        freePlan.setMaxStores(1);
        freePlan.setMaxCustomDomains(0);
        freePlan.setMaxSubdomains(1);
        freePlan.setMaxStorageMb(100);
        freePlan.setMaxProducts(50);
        freePlan.setMaxImageCount(100);

        // PRO Plan
        Plan proPlan = new Plan();
        proPlan.setName("PRO");
        proPlan.setMaxStores(10);
        proPlan.setMaxCustomDomains(5);
        proPlan.setMaxSubdomains(10);
        proPlan.setMaxStorageMb(10000);
        proPlan.setMaxProducts(1000);
        proPlan.setMaxImageCount(5000);

        // ENTERPRISE Plan
        Plan enterprisePlan = new Plan();
        enterprisePlan.setName("ENTERPRISE");
        enterprisePlan.setMaxStores(100);
        enterprisePlan.setMaxCustomDomains(50);
        enterprisePlan.setMaxSubdomains(100);
        enterprisePlan.setMaxStorageMb(100000);
        enterprisePlan.setMaxProducts(-1); // Unlimited
        enterprisePlan.setMaxImageCount(-1); // Unlimited

        // Batch-Insert für bessere Performance
        planRepository.saveAll(List.of(freePlan, proPlan, enterprisePlan));

        log.info("Plans initialized successfully: FREE, PRO, ENTERPRISE");
    }

    @Transactional
    protected void initializeTestData() {
        try {
            if (userRepository.count() > 0) {
                log.info("Test data already initialized");
                return;
            }
        } catch (Exception e) {
            log.warn("Cannot check user count - skipping test data initialization");
            return;
        }

        // Hol den FREE Plan
        Plan freePlan = planRepository.findByName("FREE")
                .orElseThrow(() -> new RuntimeException("FREE plan not found"));

        // Erstelle Test-User
        User testUser = new User();
        testUser.setEmail("test@localhost.com");
        testUser.setPasswordHash(passwordEncoder.encode("test123"));
        testUser.setRoles(Set.of(Role.USER));
        testUser.setPlan(freePlan);
        testUser = userRepository.save(testUser);

        // Erstelle Test-Store
        Store testStore = new Store();
        testStore.setName("Test Shop");
        testStore.setSlug("testshop");
        testStore.setOwner(testUser);
        testStore.setStatus(StoreStatus.ACTIVE);
        testStore = storeRepository.save(testStore);

        // Erstelle localhost Domain
        Domain localhostDomain = new Domain();
        localhostDomain.setHost("localhost:8080");
        localhostDomain.setStore(testStore);
        localhostDomain.setType(DomainType.SUBDOMAIN);
        localhostDomain.setIsPrimary(true);
        localhostDomain.setIsVerified(true);
        domainRepository.save(localhostDomain);

        log.info("Test data initialized: user=test@localhost.com, password=test123, store=testshop, domain=localhost:8080");
    }
}
