package br.com.agendainteligente;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AgendaInteligenteApplication {

    private static final Logger log = LoggerFactory.getLogger(AgendaInteligenteApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(AgendaInteligenteApplication.class, args);
        log.info("DEPLOY_MARKER=PR56_2026-05-23_CACHE-BUST");
    }
}
