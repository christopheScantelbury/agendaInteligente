package br.com.agendainteligente.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.Contact;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Agenda Inteligente API")
                        .version("1.0.0")
                        .description("API para sistema de agendamento com pagamento e emissão de NFS-e")
                        .contact(new Contact()
                                .name("Agenda Inteligente")
                                .email("contato@agendainteligente.com.br")));
    }
}

