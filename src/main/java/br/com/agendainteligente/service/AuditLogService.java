package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.AuditLog;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.AuditLogRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Registra eventos de auditoria (#95).
 * Pega o contexto (usuário atual, IP, user-agent, impersonação) automaticamente.
 *
 * Toggle: `app.audit.enabled` (default false em 10/06/2026 — economia de memória).
 * Quando false, todos os métodos `registrar(...)` viram no-op silencioso. Pra
 * reativar: set env `APP_AUDIT_ENABLED=true` ou alterar application.yml.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UsuarioRepository usuarioRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final ObjectProvider<HttpServletRequest> requestProvider;

    @Value("${app.audit.enabled:false}")
    private boolean enabled;

    public void registrar(String tipoAcao, String entidade, Long entidadeId, String descricao, Map<String, Object> metadata) {
        if (!enabled) return;  // toggle desativado — vira no-op silencioso
        try {
            AuditLog.AuditLogBuilder builder = AuditLog.builder()
                    .tipoAcao(tipoAcao)
                    .entidade(entidade)
                    .entidadeId(entidadeId)
                    .descricao(descricao)
                    .metadata(metadata);

            // BUG-05 fix: JwtAuthenticationFilter seta principal como String (email).
            // Buscar Usuario do banco a partir do email pra popular autorId/Perfil.
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                String email = auth.getName();
                usuarioRepository.findByEmail(email).ifPresentOrElse(
                        u -> {
                            builder.autorId(u.getId()).autorEmail(u.getEmail());
                            if (u.getPerfilSistema() != null) builder.autorPerfil(u.getPerfilSistema().name());
                            if (u.getAdminUnicoId() != null) builder.empresaId(u.getAdminUnicoId());
                        },
                        () -> builder.autorEmail(email)
                );
            }

            HttpServletRequest request = requestProvider.getIfAvailable();
            if (request != null) {
                builder.ip(extrairIp(request));
                String userAgent = request.getHeader("User-Agent");
                if (userAgent != null && userAgent.length() > 500) userAgent = userAgent.substring(0, 500);
                builder.userAgent(userAgent);

                // BUG-06 fix: ler impersonatedBy do claim JWT (imp_by) — mais confiável
                // que o header X-Impersonated-By, que o frontend pode esquecer de enviar.
                String token = getTokenFromRequest(request);
                if (token != null) {
                    try {
                        Long impBy = jwtTokenProvider.getImpersonatedByFromToken(token);
                        if (impBy != null) builder.impersonatedBy(impBy);
                    } catch (Exception ignored) { /* token inválido — registra sem impersonatedBy */ }
                }

                // Fallback: header X-Impersonated-By (mantido pra compatibilidade)
                String header = request.getHeader("X-Impersonated-By");
                if (header != null) {
                    try { builder.impersonatedBy(Long.parseLong(header)); } catch (Exception ignore) {}
                }
            }

            auditLogRepository.save(builder.build());
        } catch (Exception e) {
            log.warn("Falha ao gravar audit_log para {}: {}", tipoAcao, e.getMessage());
        }
    }

    public void registrar(String tipoAcao, String descricao) {
        registrar(tipoAcao, null, null, descricao, null);
    }

    private String extrairIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }

    private String getTokenFromRequest(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
