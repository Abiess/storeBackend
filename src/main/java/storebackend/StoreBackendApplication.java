package storebackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class StoreBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(StoreBackendApplication.class, args);
    }

}
