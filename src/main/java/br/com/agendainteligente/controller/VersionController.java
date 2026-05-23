package br.com.agendainteligente.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/publico/version")
public class VersionController {

    @Value("${app.version-marker:unknown}")
    private String versionMarker;

    @GetMapping
    public Map<String, String> version() {
        log.info("VERSION_ENDPOINT_CALLED marker={}", versionMarker);
        Map<String, String> result = new HashMap<>();
        result.put("marker", versionMarker != null ? versionMarker : "null-marker");
        return result;
    }
}
