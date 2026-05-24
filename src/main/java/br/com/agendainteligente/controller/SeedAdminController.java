package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class SeedAdminController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.token:}")
    private String seedToken;

    @PostMapping("/seed-demo")
    public ResponseEntity<?> seedDemoUsers(@RequestHeader(value = "X-Seed-Token", required = false) String token) {
        if (seedToken == null || seedToken.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "Seed endpoint desabilitado (APP_SEED_TOKEN não configurado)"));
        }
        if (token == null || !token.equals(seedToken)) {
            return ResponseEntity.status(401).body(Map.of("error", "Token inválido"));
        }

        List<DemoUser> demos = List.of(
                new DemoUser("chris@agendainteligente.com", "Chris (Admin Global)", "Admin@2026", PerfilUsuario.ADMIN),
                new DemoUser("salao@demo.com", "Salão Demo", "Demo@2026", PerfilUsuario.ADMINISTRADOR),
                new DemoUser("rede@demo.com", "Rede Demo", "Demo@2026", PerfilUsuario.ADMIN),
                new DemoUser("academia@demo.com", "Academia Demo", "Demo@2026", PerfilUsuario.ADMINISTRADOR)
        );

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (DemoUser demo : demos) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("email", demo.email);
            item.put("perfil", demo.perfil.name());

            if (usuarioRepository.existsByEmail(demo.email)) {
                item.put("status", "JA_EXISTIA");
                resultado.add(item);
                continue;
            }

            Usuario novo = Usuario.builder()
                    .email(demo.email)
                    .nome(demo.nome)
                    .senha(passwordEncoder.encode(demo.senha))
                    .perfilSistema(demo.perfil)
                    .ativo(true)
                    .dataCriacao(LocalDateTime.now())
                    .dataAtualizacao(LocalDateTime.now())
                    .build();
            Usuario salvo = usuarioRepository.save(novo);

            if (demo.perfil == PerfilUsuario.ADMINISTRADOR) {
                salvo.setAdminUnicoId(salvo.getId());
                usuarioRepository.save(salvo);
            }

            item.put("status", "CRIADO");
            item.put("id", salvo.getId());
            resultado.add(item);
            log.info("[SEED] Usuário demo criado: {} ({})", demo.email, demo.perfil);
        }

        return ResponseEntity.ok(Map.of("usuarios", resultado));
    }

    private record DemoUser(String email, String nome, String senha, PerfilUsuario perfil) {}
}
