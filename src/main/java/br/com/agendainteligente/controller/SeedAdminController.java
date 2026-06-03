package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.ServicoRepository;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
    private final ServicoRepository servicoRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.token:}")
    private String seedToken;

    @PostMapping("/seed-demo")
    @Transactional
    public ResponseEntity<?> seedDemoUsers(@RequestHeader(value = "X-Seed-Token", required = false) String token) {
        // Aceita autenticação como ADMIN global como alternativa ao X-Seed-Token
        // (facilita execução pelo QA sem precisar do APP_SEED_TOKEN)
        boolean autorizadoViaToken = seedToken != null && !seedToken.isBlank()
                && token != null && token.equals(seedToken);
        boolean autorizadoViaAdmin = false;
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            autorizadoViaAdmin = auth.getAuthorities().stream()
                    .anyMatch(ga -> "ROLE_ADMIN".equals(ga.getAuthority()));
        }
        if (!autorizadoViaToken && !autorizadoViaAdmin) {
            return ResponseEntity.status(401).body(Map.of(
                    "error", "Não autorizado",
                    "hint", "Envie X-Seed-Token ou autentique-se como ADMIN global"
            ));
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
                    // Retroativo: garantir horários de funcionamento pro fallback de slots virtuais
                    boolean precisaUpdate = false;
                    if (unidade.getHorarioAbertura() == null) {
                        unidade.setHorarioAbertura(LocalTime.of(8, 0));
                        precisaUpdate = true;
                    }
                    if (unidade.getHorarioFechamento() == null) {
                        unidade.setHorarioFechamento(LocalTime.of(18, 0));
                        precisaUpdate = true;
                    }
                    if (precisaUpdate) {
                        unidade = unidadeRepository.save(unidade);
                        log.info("[SEED] Unidade {} atualizada com horários padrão 08-18", unidade.getId());
                    }
                    item.put("unidadeId", unidade.getId());
                }

                // Seeds derivados: PROFISSIONAL, GERENTE, CLIENTE para esta empresa demo
                String prefixo = demo.email.split("@")[0]; // ex.: "salao"
                List<Servico> servicosDaUnidade = seedServicosDemo(unidade, demo.categoria);
                Map<String, Object> derivados = new LinkedHashMap<>();
                derivados.put("servicos", servicosDaUnidade.stream().map(Servico::getNome).collect(Collectors.toList()));
                derivados.put("profissional", seedProfissionalDemo(prefixo, usuario.getId(), unidade, servicosDaUnidade));
                derivados.put("gerente", seedGerenteDemo(prefixo, usuario.getId(), unidade));
                derivados.put("cliente", seedClienteDemo(prefixo, unidade));
                item.put("derivados", derivados);
            }
            resultado.add(item);
        }
        return ResponseEntity.ok(Map.of("usuarios", resultado));
    }

    private Map<String, Object> seedProfissionalDemo(String prefixo, Long adminUnicoId, Unidade unidade, List<Servico> servicosDaUnidade) {
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
                    .servicos(new ArrayList<>(servicosDaUnidade))
                    .ativo(true)
                    .build();
            atendente = atendenteRepository.save(atendente);
            log.info("[SEED] Atendente criado: usuario={}, atendente={}, servicos={}",
                    usuario.getId(), atendente.getId(), servicosDaUnidade.size());
        } else if (atendente.getServicos() == null || atendente.getServicos().isEmpty()) {
            // Atendente já existia mas sem serviços vinculados — vincula agora
            atendente.setServicos(new ArrayList<>(servicosDaUnidade));
            atendente = atendenteRepository.save(atendente);
            log.info("[SEED] Atendente {} re-vinculado a {} serviços", atendente.getId(), servicosDaUnidade.size());
        }
        info.put("atendenteId", atendente.getId());
        return info;
    }

    /**
     * Cria 3 serviços padrão pra cada unidade demo, baseado na categoria.
     * Idempotente — só cria se não existe outro com o mesmo nome na unidade.
     */
    private List<Servico> seedServicosDemo(Unidade unidade, CategoriaEmpresa categoria) {
        List<ServicoSpec> specs = switch (categoria) {
            case SALAO_BELEZA -> List.of(
                    new ServicoSpec("Corte feminino", "Corte com lavagem e finalização", new BigDecimal("80.00"), 60),
                    new ServicoSpec("Corte masculino", "Corte tradicional ou degradê", new BigDecimal("40.00"), 30),
                    new ServicoSpec("Hidratação", "Hidratação profunda dos fios", new BigDecimal("100.00"), 90)
            );
            case ACADEMIA -> List.of(
                    new ServicoSpec("Avaliação física", "Bioimpedância + circunferências", new BigDecimal("80.00"), 30),
                    new ServicoSpec("Treino personalizado", "Sessão 1:1 com personal", new BigDecimal("120.00"), 60),
                    new ServicoSpec("Aula funcional", "Aula em grupo de 5 pessoas", new BigDecimal("50.00"), 45)
            );
            default -> List.of(
                    new ServicoSpec("Atendimento padrão", "Sessão padrão", new BigDecimal("60.00"), 30),
                    new ServicoSpec("Atendimento estendido", "Sessão longa", new BigDecimal("120.00"), 60),
                    new ServicoSpec("Avaliação inicial", "Primeira consulta", new BigDecimal("90.00"), 45)
            );
        };

        List<Servico> existentes = servicoRepository.findByUnidadeIdAndAtivoTrue(unidade.getId());
        List<Servico> resultado = new ArrayList<>(existentes);
        for (ServicoSpec spec : specs) {
            boolean jaExiste = existentes.stream()
                    .anyMatch(s -> spec.nome.equalsIgnoreCase(s.getNome()));
            if (jaExiste) continue;
            Servico s = Servico.builder()
                    .nome(spec.nome)
                    .descricao(spec.descricao)
                    .valor(spec.valor)
                    .duracaoMinutos(spec.duracaoMin)
                    .unidade(unidade)
                    .adminUnicoId(unidade.getAdminUnicoId())
                    .ativo(true)
                    .dataCriacao(LocalDateTime.now())
                    .dataAtualizacao(LocalDateTime.now())
                    .build();
            s = servicoRepository.save(s);
            resultado.add(s);
            log.info("[SEED] Serviço {} criado na unidade {}", spec.nome, unidade.getId());
        }
        return resultado;
    }

    private record ServicoSpec(String nome, String descricao, BigDecimal valor, int duracaoMin) {}

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
                // Horário de funcionamento padrão — necessário pro fallback de slots virtuais
                // em HorarioDisponivelService (gera slots automaticamente quando o gestor
                // não cadastrou HorarioDisponivel manual).
                .horarioAbertura(LocalTime.of(8, 0))
                .horarioFechamento(LocalTime.of(18, 0))
                .dataCriacao(LocalDateTime.now())
                .dataAtualizacao(LocalDateTime.now())
                .build();
        return unidadeRepository.save(unidade);
    }

    private record DemoUser(String email, String nome, String senha,
                            PerfilUsuario perfil, CategoriaEmpresa categoria) {}
}
