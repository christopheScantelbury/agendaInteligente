package br.com.agendainteligente.config;

import br.com.agendainteligente.security.JwtTokenProvider;
import br.com.agendainteligente.service.AuditLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Registra no audit_log toda mutação (POST/PUT/PATCH/DELETE) feita com
 * token de impersonação (claim "imp_by" no JWT). Resolve BUG-06.
 *
 * GETs não são auditados para evitar inflar a tabela; mutações cobrem
 * o caso crítico (alguém impersonando alterar dados de outro tenant).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ImpersonationAuditInterceptor implements HandlerInterceptor {

    private static final Set<String> METODOS_MUTACAO = Set.of("POST", "PUT", "PATCH", "DELETE");
    private static final Set<String> PATHS_IGNORAR = Set.of(
            "/api/auth/login",
            "/api/plataforma/empresas",   // próprio assumir-sessao já registra
            "/api/plataforma/encerrar-sessao"
    );

    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogService auditLogService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!METODOS_MUTACAO.contains(request.getMethod())) return true;

        String uri = request.getRequestURI();
        for (String prefix : PATHS_IGNORAR) {
            if (uri.startsWith(prefix)) return true;
        }

        String token = extrairToken(request);
        if (token == null) return true;

        try {
            Long impBy = jwtTokenProvider.getImpersonatedByFromToken(token);
            if (impBy == null) return true;

            // Mutação feita em modo impersonado — registra
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("metodo", request.getMethod());
            meta.put("uri", uri);
            String qs = request.getQueryString();
            if (qs != null) meta.put("queryString", qs);

            auditLogService.registrar(
                    "IMPERSONATE_REQUEST",
                    null, null,
                    request.getMethod() + " " + uri,
                    meta
            );
        } catch (Exception e) {
            log.debug("Falha ao auditar request impersonada: {}", e.getMessage());
        }
        return true;
    }

    private String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) return header.substring(7);
        return null;
    }
}
