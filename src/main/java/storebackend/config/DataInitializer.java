package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import storebackend.entity.Plan;
import storebackend.repository.PlanRepository;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer {

    private final PlanRepository planRepository;

    @EventListener(ApplicationReadyEvent.class)
    public void initializeData() {
        log.info("Starting data initialization...");
        initializePlans();
        log.info("Data initialization completed - Application is ready!");
    }

    @Transactional
    private void initializePlans() {
        if (planRepository.count() > 0) {
            log.info("Plans already initialized");
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
}
