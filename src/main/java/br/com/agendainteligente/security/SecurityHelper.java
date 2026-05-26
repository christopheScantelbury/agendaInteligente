package br.com.agendainteligente.security;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Helper para resolver o {@link Usuario} autenticado no request atual.
 * <p>
 * O {@link JwtAuthenticationFilter} seta apenas o e-mail como principal (String),
 * então {@code @AuthenticationPrincipal Usuario} retorna null. Este helper
 * resolve o usuário pelo e-mail do principal.
 */
@Component
public class SecurityHelper {

    private final UsuarioRepository usuarioRepository;

    public SecurityHelper(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Retorna o Usuario autenticado ou lança BusinessException se não houver. */
    public Usuario usuarioAtual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new BusinessException("Usuário não autenticado");
        }
        String username = auth.getName();
        return usuarioRepository.findByEmail(username)
                .orElseThrow(() -> new BusinessException("Usuário autenticado não encontrado: " + username));
    }
}
