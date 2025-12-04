package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
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

    @EventListener(ApplicationReadyEvent.class)
    public void initializeData() {
        log.info("Starting data initialization...");

        try {
            // In Production werden Pläne über data.sql initialisiert
            if (isLocalDevelopment()) {
                initializePlans();
                initializeTestData();
            }

            log.info("Data initialization completed - Application is ready!");
        } catch (Exception e) {
            log.error("Failed to initialize data: {}", e.getMessage());
            log.warn("This is normal on first deployment when tables are being created.");
            log.warn("The application will work after tables are created and service is restarted.");
        }
    }

    private boolean isLocalDevelopment() {
        String datasourceUrl = environment.getProperty("spring.datasource.url", "");
        return datasourceUrl.contains("h2:mem");
    }

    @Transactional
    private void initializePlans() {
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
    private void initializeTestData() {
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
