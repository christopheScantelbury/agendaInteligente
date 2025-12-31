package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.ClienteLoginDTO;
import br.com.agendainteligente.dto.ClienteTokenDTO;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
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
        
        // Criar cliente
        ClienteDTO clienteCriado = clienteService.criar(clienteDTO);
        
        // Definir senha se fornecida
        if (senha != null && !senha.isEmpty()) {
            clienteAuthService.definirSenha(clienteCriado.getId(), senha);
        }
        
        return ResponseEntity.status(HttpStatus.CREATED).body(clienteCriado);
    }

    @PostMapping("/login")
    @Operation(summary = "Login de cliente")
    public ResponseEntity<ClienteTokenDTO> login(@Valid @RequestBody ClienteLoginDTO loginDTO) {
        return ResponseEntity.ok(clienteAuthService.login(loginDTO));
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String clienteEmailOuCpf = auth.getName();
        
        // Buscar cliente autenticado
        Cliente cliente = clienteRepository.findByEmail(clienteEmailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(clienteEmailOuCpf)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado")));
        
        // Buscar agendamentos do cliente
        List<Agendamento> agendamentos = agendamentoRepository.findByClienteId(cliente.getId());
        List<AgendamentoDTO> agendamentosDTO = agendamentos.stream()
                .map(a -> agendamentoService.buscarPorId(a.getId()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(agendamentosDTO);
    }

    @PostMapping("/agendamentos/{id}/cancelar")
    @Operation(summary = "Cancelar agendamento próprio")
    public ResponseEntity<Void> cancelarAgendamento(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String clienteEmailOuCpf = auth.getName();
        
        // Buscar cliente autenticado
        Cliente cliente = clienteRepository.findByEmail(clienteEmailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(clienteEmailOuCpf)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado")));
        
        // Validar que o agendamento pertence ao cliente autenticado
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Agendamento não encontrado"));
        
        if (!agendamento.getCliente().getId().equals(cliente.getId())) {
            throw new BusinessException("Você não tem permissão para cancelar este agendamento");
        }
        
        agendamentoService.cancelar(id);
        return ResponseEntity.noContent().build();
    }
}

