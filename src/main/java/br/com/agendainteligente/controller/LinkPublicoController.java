package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.security.SecurityHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Gerenciamento do link público da empresa (slug).
 * Permite ao gerente/administrador personalizar a URL pública usada
 * para divulgar agendamento: agendainteligente.com.br/e/{slug}
 *
 * Resolução pública (sem auth) também mora aqui via {@code /publico/empresas/{slug}}.
 */
@RestController
@RequestMapping("/api/configuracoes/link-publico")
@RequiredArgsConstructor
@Tag(name = "Link Público", description = "Slug público da empresa")
public class LinkPublicoController {

    private static final java.util.regex.Pattern SLUG_REGEX = java.util.regex.Pattern.compile("^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$");
    private static final int SLUG_MIN = 3;
    private static final int SLUG_MAX = 60;

    private final EmpresaRepository empresaRepository;
    private final SecurityHelper securityHelper;

    @GetMapping
    @Operation(summary = "Buscar slug público da empresa do usuário logado")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> buscar() {
        Empresa empresa = empresaDoUsuario();
        return ResponseEntity.ok(buildResponse(empresa));
    }

    @PutMapping
    @Operation(summary = "Atualizar slug público da empresa")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizar(@RequestBody SlugRequest req) {
        Empresa empresa = empresaDoUsuario();
        String slug = normalizar(req.slug());
        validar(slug);

        // Confere unicidade ignorando o próprio registro
        empresaRepository.findBySlugPublico(slug).ifPresent(outra -> {
            if (!outra.getId().equals(empresa.getId())) {
                throw new BusinessException("Este link já está em uso por outra empresa. Tente outro.");
            }
        });

        empresa.setSlugPublico(slug);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(buildResponse(empresa));
    }

    @DeleteMapping
    @Operation(summary = "Remover slug público (volta a ficar sem link personalizado)")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> remover() {
        Empresa empresa = empresaDoUsuario();
        empresa.setSlugPublico(null);
        empresaRepository.save(empresa);
        return ResponseEntity.ok(buildResponse(empresa));
    }

    @GetMapping("/disponibilidade")
    @Operation(summary = "Verifica se um slug está disponível")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> disponibilidade(@RequestParam("slug") String slug) {
        String normalizado = normalizar(slug);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("slug", normalizado);
        if (!SLUG_REGEX.matcher(normalizado).matches() || normalizado.length() < SLUG_MIN || normalizado.length() > SLUG_MAX) {
            body.put("disponivel", false);
            body.put("motivo", "Use 3 a 60 caracteres: letras minúsculas, números e hifens (sem espaços).");
            return ResponseEntity.ok(body);
        }
        Empresa empresaAtual = empresaDoUsuario();
        boolean ocupado = empresaRepository.findBySlugPublico(normalizado)
                .map(e -> !e.getId().equals(empresaAtual.getId()))
                .orElse(false);
        body.put("disponivel", !ocupado);
        if (ocupado) body.put("motivo", "Este link já está em uso.");
        return ResponseEntity.ok(body);
    }

    // === Helpers ===

    private Empresa empresaDoUsuario() {
        Usuario usuario = securityHelper.usuarioAtual();
        // Tenant da empresa: GERENTE/ADMINISTRADOR têm 1 empresa. ADMIN global pode ter várias.
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        return empresaRepository.findByAdminUnicoId(adminId).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("Empresa não encontrada para o usuário logado"));
    }

    private String normalizar(String raw) {
        if (raw == null) return "";
        return raw.trim().toLowerCase()
                .replaceAll("[\\s_]+", "-")
                .replaceAll("[^a-z0-9-]", "")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
    }

    private void validar(String slug) {
        if (slug.length() < SLUG_MIN || slug.length() > SLUG_MAX) {
            throw new BusinessException("O link deve ter entre " + SLUG_MIN + " e " + SLUG_MAX + " caracteres.");
        }
        if (!SLUG_REGEX.matcher(slug).matches()) {
            throw new BusinessException("Use apenas letras minúsculas, números e hifens. Não pode começar ou terminar com hifen.");
        }
    }

    private Map<String, Object> buildResponse(Empresa empresa) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("empresaId", empresa.getId());
        body.put("empresaNome", empresa.getNome());
        body.put("slug", empresa.getSlugPublico());
        return body;
    }

    public record SlugRequest(
            @NotBlank @Size(min = SLUG_MIN, max = SLUG_MAX)
            @Pattern(regexp = "^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$")
            String slug
    ) {}
}
