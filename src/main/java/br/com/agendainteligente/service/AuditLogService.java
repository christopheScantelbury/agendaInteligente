package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.AuditLog;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Registra eventos de auditoria. #95.
 * Pega o contexto (usuário atual, IP, user-agent) automaticamente quando possível.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectProvider<HttpServletRequest> requestProvider;

    public void registrar(String tipoAcao, String entidade, Long entidadeId, String descricao, Map<String, Object> metadata) {
        try {
            AuditLog.AuditLogBuilder builder = AuditLog.builder()
                    .tipoAcao(tipoAcao)
                    .entidade(entidade)
                    .entidadeId(entidadeId)
                    .descricao(descricao)
                    .metadata(metadata);

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Usuario u) {
                builder.autorId(u.getId()).autorEmail(u.getEmail());
                if (u.getPerfilSistema() != null) builder.autorPerfil(u.getPerfilSistema().name());
                if (u.getAdminUnicoId() != null) builder.empresaId(u.getAdminUnicoId());
            } else if (auth != null) {
                builder.autorEmail(String.valueOf(auth.getName()));
            }

            HttpServletRequest request = requestProvider.getIfAvailable();
            if (request != null) {
                builder.ip(extrairIp(request));
                String userAgent = request.getHeader("User-Agent");
                if (userAgent != null && userAgent.length() > 500) userAgent = userAgent.substring(0, 500);
                builder.userAgent(userAgent);
                String impersonator = request.getHeader("X-Impersonated-By");
                if (impersonator != null) {
                    try { builder.impersonatedBy(Long.parseLong(impersonator)); } catch (Exception ignore) {}
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
}
