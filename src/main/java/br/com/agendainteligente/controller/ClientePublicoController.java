package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AgendarComoVisitanteDTO;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.ClienteLoginDTO;
import br.com.agendainteligente.dto.ClienteTokenDTO;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.domain.entity.PushToken;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.PushTokenRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.service.AgendamentoService;
import br.com.agendainteligente.service.ClienteAuthService;
import br.com.agendainteligente.service.ClienteService;
import br.com.agendainteligente.service.HorarioDisponivelService;
import br.com.agendainteligente.service.PushNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/publico/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes - Público", description = "API pública para clientes agendarem e gerenciarem seus agendamentos")
public class ClientePublicoController {

    private final ClienteAuthService clienteAuthService;
    private final ClienteService clienteService;
    private final HorarioDisponivelService horarioDisponivelService;
    private final AgendamentoService agendamentoService;
    private final ClienteRepository clienteRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final UnidadeRepository unidadeRepository;
    private final ServicoRepository servicoRepository;
    private final EmpresaRepository empresaRepository;
    private final PushTokenRepository pushTokenRepository;
    private final PushNotificationService pushNotificationService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/cadastro")
    @Operation(summary = "Cadastro público de cliente — email + senha obrigatórios (cria credenciais de login)")
    public ResponseEntity<ClienteDTO> cadastrar(@Valid @RequestBody ClienteDTO clienteDTO,
                                                 @RequestParam(required = false) String senha) {
        // Verificar se já existe
        if (clienteRepository.existsByCpfCnpj(clienteDTO.getCpfCnpj())) {
            throw new BusinessException("Já existe um cliente cadastrado com este CPF/CNPJ");
        }

        if (clienteDTO.getEmail() != null && clienteRepository.existsByEmail(clienteDTO.getEmail())) {
            throw new BusinessException("Já existe um cliente cadastrado com este email");
        }

        // Usar senha do parâmetro se fornecida, senão usar do DTO
        String senhaFinal = senha != null && !senha.isEmpty() ? senha : clienteDTO.getSenha();
        if (senhaFinal != null && !senhaFinal.isEmpty()) {
            clienteDTO.setSenha(senhaFinal);
        }

        // Email + senha são OBRIGATÓRIOS no cadastro público — sem eles o cliente não consegue
        // fazer login depois (sub-bug do #117 reportado pelo QA 26/05).
        if (clienteDTO.getEmail() == null || clienteDTO.getEmail().isBlank()) {
            throw new BusinessException("Email é obrigatório para cadastro público");
        }
        if (clienteDTO.getSenha() == null || clienteDTO.getSenha().isBlank()) {
            throw new BusinessException("Senha é obrigatória para cadastro público");
        }
        if (clienteDTO.getSenha().length() < 6) {
            throw new BusinessException("Senha deve ter no mínimo 6 caracteres");
        }

        // Criar cliente (já cria usuário automaticamente — email+senha agora garantidos)
        ClienteDTO clienteCriado = clienteService.criar(clienteDTO);

        return ResponseEntity.status(HttpStatus.CREATED).body(clienteCriado);
    }

    @PostMapping("/login")
    @Operation(summary = "Login de cliente")
    public ResponseEntity<ClienteTokenDTO> login(@Valid @RequestBody ClienteLoginDTO loginDTO) {
        return ResponseEntity.ok(clienteAuthService.login(loginDTO));
    }

    /**
     * Guest checkout (#86): cria cliente (sem senha) + agendamento atomicamente.
     * Retorna token JWT temporário pro cliente poder gerenciar o agendamento criado.
     * Depois, o cliente pode "salvar conta" definindo senha via endpoint próprio.
     */
    @PostMapping("/agendar-como-visitante")
    @Operation(summary = "Agendar sem cadastro prévio (guest checkout)")
    public ResponseEntity<ClienteTokenDTO> agendarComoVisitante(@Valid @RequestBody AgendarComoVisitanteDTO dto) {
        // Verificar se já existe cliente por email
        Cliente cliente = clienteRepository.findByEmail(dto.getEmail()).orElse(null);
        if (cliente == null && dto.getCpfCnpj() != null && !dto.getCpfCnpj().isBlank()) {
            cliente = clienteRepository.findByCpfCnpj(dto.getCpfCnpj()).orElse(null);
        }

        if (cliente == null) {
            ClienteDTO clienteDTO = new ClienteDTO();
            clienteDTO.setNome(dto.getNome());
            clienteDTO.setEmail(dto.getEmail());
            clienteDTO.setTelefone(dto.getTelefone());
            clienteDTO.setCpfCnpj(dto.getCpfCnpj());
            // T6.2: se o visitante optou por criar conta (enviou senha), persiste credenciais.
            // ClienteService.criar cuida da criação do Usuario com perfilSistema=CLIENTE.
            if (dto.getSenha() != null && !dto.getSenha().isBlank()) {
                if (dto.getSenha().length() < 6) {
                    throw new BusinessException("Senha deve ter no mínimo 6 caracteres");
                }
                clienteDTO.setSenha(dto.getSenha());
            }
            ClienteDTO criado = clienteService.criar(clienteDTO);
            cliente = clienteRepository.findById(criado.getId())
                    .orElseThrow(() -> new BusinessException("Falha ao criar cliente visitante"));
        }

        // Garante que o cliente tem a unidade do agendamento como unidade principal.
        // No guest checkout o auto-cadastro não recebe unidadeId — sem isso, o
        // AgendamentoService rejeita com "Cliente não pertence a uma unidade que você pode acessar".
        if (cliente.getUnidade() == null) {
            Unidade unidadeAgendamento = unidadeRepository.findById(dto.getUnidadeId())
                    .orElseThrow(() -> new BusinessException("Unidade não encontrada"));
            cliente.setUnidade(unidadeAgendamento);
            cliente = clienteRepository.save(cliente);
        }

        // Cria agendamento
        AgendamentoDTO ag = new AgendamentoDTO();
        ag.setClienteId(cliente.getId());
        ag.setUnidadeId(dto.getUnidadeId());
        ag.setAtendenteId(dto.getAtendenteId());
        ag.setDataHoraInicio(dto.getDataHoraInicio());
        ag.setFormaPagamentoPreferida(dto.getFormaPagamentoPreferida());
        ag.setServicos(dto.getServicos());

        // AgendamentoService.criar() valida permissão via SecurityContext. Em chamada
        // pública (guest) o contexto é anonymousUser → "Usuário não encontrado".
        // Populamos um contexto temporário como CLIENTE com o email do próprio cliente.
        // O service trata cliente-sem-Usuario via fallback em clienteRepository.findByEmail().
        SecurityContext previous = SecurityContextHolder.getContext();
        try {
            SecurityContext fresh = SecurityContextHolder.createEmptyContext();
            UsernamePasswordAuthenticationToken guestAuth = new UsernamePasswordAuthenticationToken(
                    cliente.getEmail(),
                    null,
                    java.util.List.of(new SimpleGrantedAuthority("ROLE_CLIENTE"))
            );
            fresh.setAuthentication(guestAuth);
            SecurityContextHolder.setContext(fresh);

            AgendamentoDTO agCriadoTemp = agendamentoService.criar(ag);
            ag = agCriadoTemp;
        } finally {
            SecurityContextHolder.setContext(previous);
        }
        AgendamentoDTO agCriado = ag;

        // Push notification de confirmação (best-effort, async).
        pushNotificationService.enviarParaCliente(
                cliente.getId(),
                "Agendamento confirmado",
                "Seu horário foi reservado. Veja detalhes no app.",
                java.util.Map.of("agendamentoId", agCriado.getId(), "tipo", "AGENDAMENTO_CRIADO")
        );

        // Gera token JWT temporário pro cliente acompanhar
        ClienteLoginDTO loginPayload = new ClienteLoginDTO();
        loginPayload.setEmailOuCpf(cliente.getEmail());
        // Senha temporária aleatória — não persistida; só serve pra emitir o token
        // Alternativa: criar método clienteAuthService.emitirTokenSemSenha(cliente)
        // Por hora, definimos senha temporária e logamos. Senha real fica null no banco.
        String tokenTemp = clienteAuthService.emitirTokenVisitante(cliente);
        ClienteTokenDTO token = new ClienteTokenDTO();
        token.setToken(tokenTemp);
        token.setTipo("Bearer");
        token.setClienteId(cliente.getId());
        token.setNome(cliente.getNome());
        token.setEmail(cliente.getEmail());

        return ResponseEntity.status(HttpStatus.CREATED).body(token);
    }

    /**
     * SEC: empresas que o cliente autenticado pertence. Vazio quando anônimo
     * OU quando o cliente é novo sem unidade vinculada (1º agendamento).
     * Comportamento:
     * - null  → sem filtro (anônimo ou cliente sem vinculação)
     * - vazio → cliente conhecido mas SEM empresas (raro; nada visível)
     * - set   → filtrar pelas empresas listadas
     */
    private java.util.Set<Long> empresasPermitidasParaClienteLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null; // anônimo — sem filtro (mantém fluxo de cadastro inicial)
        }
        String identifier = auth.getName();
        Cliente cliente = clienteRepository.findByEmail(identifier)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(identifier).orElse(null));
        if (cliente == null) return null;

        java.util.Set<Long> empresaIds = new java.util.HashSet<>();
        if (cliente.getUnidade() != null && cliente.getUnidade().getEmpresa() != null) {
            empresaIds.add(cliente.getUnidade().getEmpresa().getId());
        }
        if (cliente.getUnidades() != null) {
            cliente.getUnidades().forEach(u -> {
                if (u.getEmpresa() != null) empresaIds.add(u.getEmpresa().getId());
            });
        }
        // Cliente conhecido mas sem unidade vinculada (recém-criado, 1º agendamento):
        // mantém sem filtro pra permitir escolher onde agendar a 1ª vez.
        if (empresaIds.isEmpty()) return null;
        return empresaIds;
    }

    /** True quando a unidade pertence a alguma empresa permitida pro cliente logado. */
    private boolean unidadeAcessivelPeloClienteLogado(Unidade unidade) {
        java.util.Set<Long> permitidas = empresasPermitidasParaClienteLogado();
        if (permitidas == null) return true; // anônimo ou sem vínculo prévio
        if (unidade.getEmpresa() == null) return false;
        return permitidas.contains(unidade.getEmpresa().getId());
    }

    @GetMapping("/unidades")
    @Operation(summary = "Listar unidades ativas — quando cliente logado, filtra por empresas dele")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<java.util.Map<String, Object>>> listarUnidadesPublicas() {
        // SEC #SEC02 — vazamento multi-tenant: filtrar pelas empresas do cliente logado.
        java.util.Set<Long> permitidas = empresasPermitidasParaClienteLogado();
        List<java.util.Map<String, Object>> unidades = unidadeRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                .filter(u -> permitidas == null
                        || (u.getEmpresa() != null && permitidas.contains(u.getEmpresa().getId())))
                .map(u -> {
                    java.util.Map<String, Object> dto = new java.util.LinkedHashMap<>();
                    dto.put("id", u.getId());
                    dto.put("nome", u.getNome());
                    dto.put("descricao", u.getDescricao());
                    dto.put("endereco", u.getEndereco());
                    dto.put("bairro", u.getBairro());
                    dto.put("cidade", u.getCidade());
                    dto.put("uf", u.getUf());
                    dto.put("telefone", u.getTelefone());
                    if (u.getEmpresa() != null) {
                        dto.put("empresaNome", u.getEmpresa().getNome());
                        dto.put("empresaCategoria", u.getEmpresa().getCategoria() != null
                                ? u.getEmpresa().getCategoria().name() : null);
                    }
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(unidades);
    }

    @GetMapping("/unidades/{unidadeId}/servicos")
    @Operation(summary = "Listar serviços ativos de uma unidade — quando cliente logado, valida acesso à unidade")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<java.util.Map<String, Object>>> listarServicosPublicos(@PathVariable Long unidadeId) {
        // SEC #SEC02 — bloquear se cliente logado tentar acessar serviços de outra empresa
        Unidade unidade = unidadeRepository.findById(unidadeId).orElse(null);
        if (unidade != null && !unidadeAcessivelPeloClienteLogado(unidade)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(List.of());
        }
        List<java.util.Map<String, Object>> servicos = servicoRepository.findByUnidadeIdAndAtivoTrue(unidadeId).stream()
                .map(s -> {
                    java.util.Map<String, Object> dto = new java.util.LinkedHashMap<>();
                    dto.put("id", s.getId());
                    dto.put("nome", s.getNome());
                    dto.put("descricao", s.getDescricao());
                    dto.put("valor", s.getValor());
                    dto.put("duracaoMinutos", s.getDuracaoMinutos());
                    return dto;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(servicos);
    }

    @GetMapping("/horarios-disponiveis")
    @Operation(summary = "Buscar horários disponíveis para agendamento")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<HorarioDisponivelDTO>> buscarHorariosDisponiveis(
            @RequestParam Long unidadeId,
            @RequestParam Long servicoId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {

        // SEC #SEC02 — bloqueia consulta de horários de unidade fora do tenant do cliente logado.
        Unidade unidade = unidadeRepository.findById(unidadeId).orElse(null);
        if (unidade != null && !unidadeAcessivelPeloClienteLogado(unidade)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(List.of());
        }

        List<HorarioDisponivelDTO> horarios = horarioDisponivelService.buscarHorariosDisponiveis(
                unidadeId, servicoId, dataInicio, dataFim);
        
        return ResponseEntity.ok(horarios);
    }

    @PostMapping("/agendamentos")
    @Operation(summary = "Criar novo agendamento (requer autenticação)")
    public ResponseEntity<AgendamentoDTO> criarAgendamento(@Valid @RequestBody AgendamentoDTO agendamentoDTO) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String clienteEmailOuCpf = auth.getName();

        // Buscar cliente autenticado
        Cliente cliente = clienteRepository.findByEmail(clienteEmailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(clienteEmailOuCpf)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado")));

        // SEC #SEC02 — vazamento multi-tenant: validar que a unidade no payload pertence
        // a uma empresa que o cliente está vinculado. Cliente sem vinculação prévia
        // (1º agendamento) cria o vínculo nessa unidade — comportamento atual via service.
        if (agendamentoDTO.getUnidadeId() != null) {
            Unidade unidadeAlvo = unidadeRepository.findById(agendamentoDTO.getUnidadeId()).orElse(null);
            if (unidadeAlvo != null && !unidadeAcessivelPeloClienteLogado(unidadeAlvo)) {
                throw new BusinessException("Você não tem acesso a esta unidade para agendar.");
            }
        }

        // Garantir que o agendamento seja do cliente autenticado
        agendamentoDTO.setClienteId(cliente.getId());

        AgendamentoDTO criado = agendamentoService.criar(agendamentoDTO);

        // Push notification de confirmação (best-effort, async).
        pushNotificationService.enviarParaCliente(
                cliente.getId(),
                "Agendamento confirmado",
                "Seu horário foi reservado. Veja detalhes no app.",
                java.util.Map.of("agendamentoId", criado.getId(), "tipo", "AGENDAMENTO_CRIADO")
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @GetMapping("/meus-agendamentos")
    @Operation(summary = "Listar agendamentos do cliente autenticado")
    public ResponseEntity<List<AgendamentoDTO>> meusAgendamentos() {
        Cliente cliente = obterClienteAutenticado();
        
        // Buscar apenas agendamentos ativos (cancelados ficam no histórico separado)
        List<Agendamento> agendamentos = agendamentoRepository.findByClienteId(cliente.getId()).stream()
                .filter(a -> a.getStatus() != StatusAgendamento.CANCELADO)
                .collect(Collectors.toList());

        List<AgendamentoDTO> agendamentosDTO = agendamentos.stream()
                .map(a -> agendamentoService.buscarPorId(a.getId()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(agendamentosDTO);
    }

    @GetMapping("/meus-cancelamentos")
    @Operation(summary = "Listar histórico de cancelamentos do cliente autenticado")
    public ResponseEntity<List<AgendamentoDTO>> meusCancelamentos() {
        Cliente cliente = obterClienteAutenticado();

        List<Agendamento> cancelamentos = agendamentoRepository.findByClienteIdAndStatusOrderByDataHoraInicioDesc(
                cliente.getId(),
                StatusAgendamento.CANCELADO
        );

        List<AgendamentoDTO> agendamentosDTO = cancelamentos.stream()
                .map(a -> agendamentoService.buscarPorId(a.getId()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(agendamentosDTO);
    }

    @PostMapping("/agendamentos/{id}/cancelar")
    @Operation(summary = "Cancelar agendamento próprio")
    public ResponseEntity<Void> cancelarAgendamento(@PathVariable Long id) {
        Cliente cliente = obterClienteAutenticado();
        
        // Validar que o agendamento pertence ao cliente autenticado
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Agendamento não encontrado"));
        
        if (!agendamento.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("Você não tem permissão para cancelar este agendamento");
        }
        
        agendamentoService.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Registra/atualiza token de push notification do dispositivo do cliente.
     * Chamado pelo app mobile no boot após o cliente conceder permissão.
     */
    @PostMapping("/push-token")
    @Operation(summary = "Registra Expo push token do dispositivo (cliente autenticado)")
    public ResponseEntity<Void> registrarPushToken(@RequestBody java.util.Map<String, String> body) {
        Cliente cliente = obterClienteAutenticado();
        String token = body.get("token");
        if (token == null || token.isBlank()) {
            throw new BusinessException("Token é obrigatório");
        }
        // Idempotente: atualiza cliente_id se token já existe (caso o user troque de conta no mesmo device)
        PushToken pt = pushTokenRepository.findByToken(token).orElseGet(PushToken::new);
        pt.setToken(token);
        pt.setClienteId(cliente.getId());
        pt.setPlataforma(body.getOrDefault("plataforma", null));
        pt.setDeviceInfo(body.getOrDefault("deviceInfo", null));
        pt.setAtivo(true);
        pushTokenRepository.save(pt);
        return ResponseEntity.noContent().build();
    }

    private Cliente obterClienteAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String clienteEmailOuCpf = auth.getName();

        return clienteRepository.findByEmail(clienteEmailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(clienteEmailOuCpf)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado")));
    }

    @GetMapping("/empresas/{slug}")
    @Operation(summary = "Resolver slug público da empresa para landing/agendamento (sem auth)")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<java.util.Map<String, Object>> resolverSlugEmpresa(@PathVariable String slug) {
        br.com.agendainteligente.domain.entity.Empresa empresa = empresaRepository.findBySlugPublico(slug)
                .filter(e -> Boolean.TRUE.equals(e.getAtivo()))
                .orElseThrow(() -> new br.com.agendainteligente.exception.ResourceNotFoundException("Página não encontrada"));

        java.util.Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("empresaId", empresa.getId());
        body.put("nome", empresa.getNome());
        body.put("categoria", empresa.getCategoria() != null ? empresa.getCategoria().name() : null);
        body.put("logo", empresa.getLogo());
        body.put("corApp", empresa.getCorApp());
        body.put("cidade", empresa.getCidade());
        body.put("uf", empresa.getUf());

        // Unidades ativas da empresa
        java.util.List<java.util.Map<String, Object>> unidades = empresa.getUnidades() == null
                ? java.util.List.of()
                : empresa.getUnidades().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                    .map(u -> {
                        java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                        m.put("id", u.getId());
                        m.put("nome", u.getNome());
                        m.put("endereco", u.getEndereco());
                        m.put("bairro", u.getBairro());
                        m.put("cidade", u.getCidade());
                        return m;
                    })
                    .collect(Collectors.toList());
        body.put("unidades", unidades);
        return ResponseEntity.ok(body);
    }
}
