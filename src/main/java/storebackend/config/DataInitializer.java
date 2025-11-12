package storebackend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import storebackend.entity.Plan;
import storebackend.repository.PlanRepository;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final PlanRepository planRepository;

    @Override
    public void run(String... args) throws Exception {
        initializePlans();
    }

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
        planRepository.save(freePlan);

        // PRO Plan
        Plan proPlan = new Plan();
        proPlan.setName("PRO");
        proPlan.setMaxStores(10);
        proPlan.setMaxCustomDomains(5);
        proPlan.setMaxSubdomains(10);
        proPlan.setMaxStorageMb(10000);
        proPlan.setMaxProducts(1000);
        proPlan.setMaxImageCount(5000);
        planRepository.save(proPlan);

        // ENTERPRISE Plan
        Plan enterprisePlan = new Plan();
        enterprisePlan.setName("ENTERPRISE");
        enterprisePlan.setMaxStores(100);
        enterprisePlan.setMaxCustomDomains(50);
        enterprisePlan.setMaxSubdomains(100);
        enterprisePlan.setMaxStorageMb(100000);
        enterprisePlan.setMaxProducts(-1); // Unlimited
        enterprisePlan.setMaxImageCount(-1); // Unlimited
        planRepository.save(enterprisePlan);

        log.info("Plans initialized successfully: FREE, PRO, ENTERPRISE");
    }
}
