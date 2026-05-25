package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
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
    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.token:}")
    private String seedToken;

    @PostMapping("/seed-demo")
    @Transactional
    public ResponseEntity<?> seedDemoUsers(@RequestHeader(value = "X-Seed-Token", required = false) String token) {
        if (seedToken == null || seedToken.isBlank()) {
            return ResponseEntity.status(503).body(Map.of("error", "Seed endpoint desabilitado (APP_SEED_TOKEN não configurado)"));
        }
        if (token == null || !token.equals(seedToken)) {
            return ResponseEntity.status(401).body(Map.of("error", "Token inválido"));
        }

        List<DemoUser> demos = List.of(
                new DemoUser("chris@agendainteligente.com", "Chris (Admin Global)", "Admin@2026", PerfilUsuario.ADMIN, null),
                new DemoUser("salao@demo.com", "Salão Demo", "Demo@2026", PerfilUsuario.ADMINISTRADOR, CategoriaEmpresa.SALAO_BELEZA),
                new DemoUser("rede@demo.com", "Rede Demo", "Demo@2026", PerfilUsuario.ADMIN, null),
                new DemoUser("academia@demo.com", "Academia Demo", "Demo@2026", PerfilUsuario.ADMINISTRADOR, CategoriaEmpresa.ACADEMIA)
        );

        List<Map<String, Object>> resultado = new ArrayList<>();
        for (DemoUser demo : demos) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("email", demo.email);
            item.put("perfil", demo.perfil.name());

            Usuario usuario = usuarioRepository.findByEmail(demo.email).orElse(null);
            if (usuario == null) {
                usuario = Usuario.builder()
                        .email(demo.email)
                        .nome(demo.nome)
                        .senha(passwordEncoder.encode(demo.senha))
                        .perfilSistema(demo.perfil)
                        .ativo(true)
                        .dataCriacao(LocalDateTime.now())
                        .dataAtualizacao(LocalDateTime.now())
                        .build();
                usuario = usuarioRepository.save(usuario);
                if (demo.perfil == PerfilUsuario.ADMINISTRADOR) {
                    usuario.setAdminUnicoId(usuario.getId());
                    usuario = usuarioRepository.save(usuario);
                }
                item.put("status", "CRIADO");
                item.put("id", usuario.getId());
                log.info("[SEED] Usuário criado: {} (id={})", demo.email, usuario.getId());
            } else {
                item.put("status", "JA_EXISTIA");
                item.put("id", usuario.getId());
            }

            // Garantir empresa + unidade para ADMINISTRADOR
            if (demo.perfil == PerfilUsuario.ADMINISTRADOR && demo.categoria != null) {
                List<Unidade> unidadesExistentes = unidadeRepository.findByAdminUnicoId(usuario.getId());
                if (unidadesExistentes.isEmpty()) {
                    List<Empresa> empresasExistentes = empresaRepository.findByAdminUnicoId(usuario.getId());
                    Empresa empresa = empresasExistentes.isEmpty()
                            ? criarEmpresaDemo(usuario, demo.categoria)
                            : empresasExistentes.get(0);
                    Unidade unidade = criarUnidadeDemo(usuario, empresa);
                    item.put("empresaId", empresa.getId());
                    item.put("unidadeId", unidade.getId());
                    log.info("[SEED] Empresa+Unidade criadas para {}: empresa={}, unidade={}",
                            demo.email, empresa.getId(), unidade.getId());
                } else {
                    item.put("unidadeId", unidadesExistentes.get(0).getId());
                }
            }
            resultado.add(item);
        }
        return ResponseEntity.ok(Map.of("usuarios", resultado));
    }

    private Empresa criarEmpresaDemo(Usuario usuario, CategoriaEmpresa categoria) {
        Empresa empresa = Empresa.builder()
                .nome(usuario.getNome() + " - Empresa")
                .razaoSocial(usuario.getNome() + " LTDA")
                .email(usuario.getEmail())
                .ativo(true)
                .categoria(categoria)
                .adminUnicoId(usuario.getId())
                .dataCriacao(LocalDateTime.now())
                .dataAtualizacao(LocalDateTime.now())
                .build();
        return empresaRepository.save(empresa);
    }

    private Unidade criarUnidadeDemo(Usuario usuario, Empresa empresa) {
        Unidade unidade = Unidade.builder()
                .nome(usuario.getNome() + " - Unidade Principal")
                .descricao("Unidade criada automaticamente pelo seed")
                .empresa(empresa)
                .adminUnicoId(usuario.getId())
                .ativo(true)
                .dataCriacao(LocalDateTime.now())
                .dataAtualizacao(LocalDateTime.now())
                .build();
        return unidadeRepository.save(unidade);
    }

    private record DemoUser(String email, String nome, String senha,
                            PerfilUsuario perfil, CategoriaEmpresa categoria) {}
}
