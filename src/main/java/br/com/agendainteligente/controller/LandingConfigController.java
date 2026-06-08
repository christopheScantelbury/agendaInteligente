package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.LandingConfig;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.LandingConfigRepository;
import br.com.agendainteligente.security.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Configuração editável da Landing Page.
 * - GET é público (Landing consome anônimo)
 * - PUT só ADMIN GLOBAL (mesmo padrão de PlataformaController)
 */
@RestController
@RequestMapping("/api/landing-config")
@RequiredArgsConstructor
public class LandingConfigController {

    private static final Long SINGLETON_ID = 1L;

    private final LandingConfigRepository repository;
    private final SecurityHelper securityHelper;

    /** Catálogo público. Sem auth. */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> get() {
        LandingConfig config = repository.findById(SINGLETON_ID)
                .orElseThrow(() -> new ResourceNotFoundException("Landing config não inicializada"));
        return ResponseEntity.ok(config.getConteudo());
    }

    /**
     * Edição completa do conteúdo. Substitui (NÃO faz merge — frontend manda o JSON inteiro).
     * Só ADMIN GLOBAL pode editar.
     */
    @PutMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizar(@RequestBody Map<String, Object> conteudo) {
        if (conteudo == null || conteudo.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Conteúdo vazio"));
        }
        LandingConfig config = repository.findById(SINGLETON_ID)
                .orElseGet(() -> LandingConfig.builder().id(SINGLETON_ID).build());
        config.setConteudo(conteudo);
        config.setAtualizadoPorId(securityHelper.usuarioAtual().getId());
        config = repository.save(config);
        return ResponseEntity.ok(config.getConteudo());
    }
}
