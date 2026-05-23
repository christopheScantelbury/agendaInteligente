package br.com.agendainteligente.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Endpoint público para verificar qual versão do código está deployada.
 * Usado pelo pipeline CI/CD para confirmar que o redeploy do Railway
 * realmente atualizou o container — o /actuator/health responde antes
 * do novo container subir e dá falsos positivos.
 */
@RestController
@RequestMapping("/api/publico/version")
public class VersionController {

    @Value("${app.version-marker:unknown}")
    private String versionMarker;

    @GetMapping
    public Map<String, String> version() {
        return Map.of("marker", versionMarker);
    }
}
