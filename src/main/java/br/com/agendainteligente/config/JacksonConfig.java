package br.com.agendainteligente.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.deser.std.StdDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        // Formatters para diferentes formatos de data
        DateTimeFormatter formatterComSegundos = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
        DateTimeFormatter formatterSemSegundos = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
        DateTimeFormatter formatterISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        // Deserializador customizado que aceita múltiplos formatos
        StdDeserializer<LocalDateTime> deserializer = new StdDeserializer<LocalDateTime>(LocalDateTime.class) {
            @Override
            public LocalDateTime deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
                String dateString = p.getText();
                
                // Tenta primeiro com segundos
                try {
                    return LocalDateTime.parse(dateString, formatterComSegundos);
                } catch (DateTimeParseException e1) {
                    // Tenta sem segundos
                    try {
                        return LocalDateTime.parse(dateString, formatterSemSegundos);
                    } catch (DateTimeParseException e2) {
                        // Tenta formato ISO
                        try {
                            return LocalDateTime.parse(dateString, formatterISO);
                        } catch (DateTimeParseException e3) {
                            throw new IOException("Não foi possível fazer parse da data: " + dateString, e3);
                        }
                    }
                }
            }
        };

        SimpleModule module = new SimpleModule();
        module.addDeserializer(LocalDateTime.class, deserializer);

        return builder
                .modules(module, new JavaTimeModule())
                .featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
    }
}

