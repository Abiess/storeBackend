package storebackend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.hibernate5.Hibernate5Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * Jackson Configuration für Hibernate Lazy Loading Support
 * Behebt: ByteBuddyInterceptor Serialization Error
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilder jackson2ObjectMapperBuilder() {
        Jackson2ObjectMapperBuilder builder = new Jackson2ObjectMapperBuilder();

        // Hibernate5Module registrieren - verhindert Lazy Loading Fehler
        Hibernate5Module hibernate5Module = new Hibernate5Module();

        // FORCE_LAZY_LOADING = false: Lazy-loaded Properties werden als null serialisiert
        // Das ist sicherer und vermeidet N+1 Query-Probleme
        hibernate5Module.disable(Hibernate5Module.Feature.FORCE_LAZY_LOADING);

        builder.modulesToInstall(hibernate5Module);

        return builder;
    }
}

