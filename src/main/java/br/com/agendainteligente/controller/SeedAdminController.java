package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ClienteRepository;
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

import java.time.LocalDate;
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
    private final AtendenteRepository atendenteRepository;
    private final ClienteRepository clienteRepository;
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

            // Garantir empresa + unidade para ADMINISTRADOR + seeds derivados (gerente/profissional/cliente)
            if (demo.perfil == PerfilUsuario.ADMINISTRADOR && demo.categoria != null) {
                List<Unidade> unidadesExistentes = unidadeRepository.findByAdminUnicoId(usuario.getId());
                Unidade unidade;
                if (unidadesExistentes.isEmpty()) {
                    List<Empresa> empresasExistentes = empresaRepository.findByAdminUnicoId(usuario.getId());
                    Empresa empresa = empresasExistentes.isEmpty()
                            ? criarEmpresaDemo(usuario, demo.categoria)
                            : empresasExistentes.get(0);
                    unidade = criarUnidadeDemo(usuario, empresa);
                    item.put("empresaId", empresa.getId());
                    item.put("unidadeId", unidade.getId());
                    log.info("[SEED] Empresa+Unidade criadas para {}: empresa={}, unidade={}",
                            demo.email, empresa.getId(), unidade.getId());
                } else {
                    unidade = unidadesExistentes.get(0);
                    item.put("unidadeId", unidade.getId());
                }

                // Seeds derivados: PROFISSIONAL, GERENTE, CLIENTE para esta empresa demo
                String prefixo = demo.email.split("@")[0]; // ex.: "salao"
                Map<String, Object> derivados = new LinkedHashMap<>();
                derivados.put("profissional", seedProfissionalDemo(prefixo, usuario.getId(), unidade));
                derivados.put("gerente", seedGerenteDemo(prefixo, usuario.getId(), unidade));
                derivados.put("cliente", seedClienteDemo(prefixo, unidade));
                item.put("derivados", derivados);
            }
            resultado.add(item);
        }
        return ResponseEntity.ok(Map.of("usuarios", resultado));
    }

    private Map<String, Object> seedProfissionalDemo(String prefixo, Long adminUnicoId, Unidade unidade) {
        String email = "profissional@" + prefixo + ".demo.com";
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("email", email);
        info.put("senha", "Demo@2026");

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) {
            usuario = Usuario.builder()
                    .email(email)
                    .nome("Profissional " + capitalizar(prefixo))
                    .senha(passwordEncoder.encode("Demo@2026"))
                    .perfilSistema(PerfilUsuario.PROFISSIONAL)
                    .adminUnicoId(adminUnicoId)
                    .unidades(new ArrayList<>(List.of(unidade)))
                    .ativo(true)
                    .dataCriacao(LocalDateTime.now())
                    .dataAtualizacao(LocalDateTime.now())
                    .build();
            usuario = usuarioRepository.save(usuario);
            log.info("[SEED] Profissional criado: {} (id={})", email, usuario.getId());
            info.put("status", "CRIADO");
        } else {
            info.put("status", "JA_EXISTIA");
        }
        info.put("usuarioId", usuario.getId());

        Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId()).orElse(null);
        if (atendente == null) {
            atendente = Atendente.builder()
                    .usuario(usuario)
                    .unidade(unidade)
                    .cpf(cpfFicticio(prefixo, "P"))
                    .telefone("11999990000")
                    .servicos(new ArrayList<>())
                    .ativo(true)
                    .build();
            atendente = atendenteRepository.save(atendente);
            log.info("[SEED] Atendente criado: usuario={}, atendente={}", usuario.getId(), atendente.getId());
        }
        info.put("atendenteId", atendente.getId());
        return info;
    }

    private Map<String, Object> seedGerenteDemo(String prefixo, Long adminUnicoId, Unidade unidade) {
        String email = "gerente@" + prefixo + ".demo.com";
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("email", email);
        info.put("senha", "Demo@2026");

        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        if (usuario == null) {
            usuario = Usuario.builder()
                    .email(email)
                    .nome("Gerente " + capitalizar(prefixo))
                    .senha(passwordEncoder.encode("Demo@2026"))
                    .perfilSistema(PerfilUsuario.GERENTE)
                    .adminUnicoId(adminUnicoId)
                    .unidades(new ArrayList<>(List.of(unidade)))
                    .ativo(true)
                    .dataCriacao(LocalDateTime.now())
                    .dataAtualizacao(LocalDateTime.now())
                    .build();
            usuario = usuarioRepository.save(usuario);
            log.info("[SEED] Gerente criado: {} (id={})", email, usuario.getId());
            info.put("status", "CRIADO");
        } else {
            info.put("status", "JA_EXISTIA");
        }
        info.put("usuarioId", usuario.getId());
        return info;
    }

    private Map<String, Object> seedClienteDemo(String prefixo, Unidade unidade) {
        String email = "cliente@" + prefixo + ".demo.com";
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("email", email);
        info.put("senha", "Demo@2026");

        Cliente cliente = clienteRepository.findByEmail(email).orElse(null);
        if (cliente == null) {
            cliente = Cliente.builder()
                    .nome("Cliente " + capitalizar(prefixo))
                    .email(email)
                    .cpfCnpj(cpfFicticio(prefixo, "C"))
                    .telefone("11988880000")
                    .dataNascimento(LocalDate.of(1995, 1, 1))
                    .senha(passwordEncoder.encode("Demo@2026"))
                    .unidade(unidade)
                    .ativo(true)
                    .dataCriacao(LocalDateTime.now())
                    .dataAtualizacao(LocalDateTime.now())
                    .build();
            cliente = clienteRepository.save(cliente);
            log.info("[SEED] Cliente criado: {} (id={})", email, cliente.getId());
            info.put("status", "CRIADO");
        } else {
            info.put("status", "JA_EXISTIA");
        }
        info.put("clienteId", cliente.getId());
        return info;
    }

    private String capitalizar(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private String cpfFicticio(String prefixo, String marcador) {
        // CPF fictício determinístico baseado em hash do prefixo (apenas dígitos, 11 chars)
        int hash = Math.abs((prefixo + marcador).hashCode());
        String num = String.format("%011d", hash % 100_000_000_000L);
        return num.substring(0, 11);
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
