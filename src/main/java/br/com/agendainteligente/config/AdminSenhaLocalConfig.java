package br.com.agendainteligente.config;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Ao subir com perfil "local", atualiza a senha do admin para 123456
 * usando o mesmo PasswordEncoder da aplicacao (sem migration).
 */
@Component
@Profile("local")
@RequiredArgsConstructor
@Slf4j
public class AdminSenhaLocalConfig implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String ADMIN_EMAIL = "admin@agendainteligente.com";
    private static final String SENHA_LOCAL = "123456";

    @Override
    public void run(ApplicationArguments args) {
        usuarioRepository.findByEmail(ADMIN_EMAIL).ifPresent(admin -> {
            String hash = passwordEncoder.encode(SENHA_LOCAL);
            admin.setSenha(hash);
            usuarioRepository.save(admin);
            log.info("[LOCAL] Senha do admin atualizada para {} (hash gerado pela aplicacao). Faça login com essa senha.", SENHA_LOCAL);
        });
    }
}
