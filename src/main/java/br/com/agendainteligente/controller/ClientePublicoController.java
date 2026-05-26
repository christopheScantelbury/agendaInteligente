package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AgendarComoVisitanteDTO;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.ClienteLoginDTO;
import br.com.agendainteligente.dto.ClienteTokenDTO;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.service.AgendamentoService;
import br.com.agendainteligente.service.ClienteAuthService;
import br.com.agendainteligente.service.ClienteService;
import br.com.agendainteligente.service.HorarioDisponivelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/cadastro")
    @Operation(summary = "Cadastro público de cliente")
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
        
        // Criar cliente (já cria usuário automaticamente se tiver email e senha)
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
            // Cria sem senha (cliente "anônimo" — só pode logar via link de gestão futuramente)
            ClienteDTO clienteDTO = new ClienteDTO();
            clienteDTO.setNome(dto.getNome());
            clienteDTO.setEmail(dto.getEmail());
            clienteDTO.setTelefone(dto.getTelefone());
            clienteDTO.setCpfCnpj(dto.getCpfCnpj());
            ClienteDTO criado = clienteService.criar(clienteDTO);
            cliente = clienteRepository.findById(criado.getId())
                    .orElseThrow(() -> new BusinessException("Falha ao criar cliente visitante"));
        }

        // Cria agendamento
        AgendamentoDTO ag = new AgendamentoDTO();
        ag.setClienteId(cliente.getId());
        ag.setUnidadeId(dto.getUnidadeId());
        ag.setAtendenteId(dto.getAtendenteId());
        ag.setDataHoraInicio(dto.getDataHoraInicio());
        ag.setFormaPagamentoPreferida(dto.getFormaPagamentoPreferida());
        ag.setServicos(dto.getServicos());
        agendamentoService.criar(ag);

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

    @GetMapping("/unidades")
    @Operation(summary = "Listar unidades ativas disponíveis para agendamento (sem auth necessária)")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<java.util.Map<String, Object>>> listarUnidadesPublicas() {
        List<java.util.Map<String, Object>> unidades = unidadeRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
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
    @Operation(summary = "Listar serviços ativos de uma unidade (sem auth necessária)")
    public ResponseEntity<List<java.util.Map<String, Object>>> listarServicosPublicos(@PathVariable Long unidadeId) {
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
    public ResponseEntity<List<HorarioDisponivelDTO>> buscarHorariosDisponiveis(
            @RequestParam Long unidadeId,
            @RequestParam Long servicoId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        
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
        
        // Garantir que o agendamento seja do cliente autenticado
        agendamentoDTO.setClienteId(cliente.getId());
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(agendamentoService.criar(agendamentoDTO));
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

    private Cliente obterClienteAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String clienteEmailOuCpf = auth.getName();

        return clienteRepository.findByEmail(clienteEmailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(clienteEmailOuCpf)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado")));
    }
}
