package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusPagamento;
import br.com.agendainteligente.domain.enums.TipoPagamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AgendamentoServicoDTO;
import br.com.agendainteligente.dto.FinalizarAgendamentoDTO;
import br.com.agendainteligente.dto.RecorrenciaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.AgendamentoMapper;
import br.com.agendainteligente.mapper.AgendamentoServicoMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AgendamentoServicoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.GerenteRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import br.com.agendainteligente.repository.PagamentoRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoServicoRepository agendamentoServicoRepository;
    private final ClienteRepository clienteRepository;
    private final ServicoRepository servicoRepository;
    private final UnidadeRepository unidadeRepository;
    private final AtendenteRepository atendenteRepository;
    private final GerenteRepository gerenteRepository;
    private final AgendamentoRecorrenteService agendamentoRecorrenteService;
    private final UsuarioRepository usuarioRepository;
    private final AgendamentoMapper agendamentoMapper;
    private final AgendamentoServicoMapper agendamentoServicoMapper;
    private final NotaFiscalService notaFiscalService;
    private final PagamentoRepository pagamentoRepository;
    private final NotaFiscalRepository notaFiscalRepository;
    private final LembreteAgendadoService lembreteAgendadoService;

    @Transactional(readOnly = true)
    public List<AgendamentoDTO> listarTodos() {
        log.debug("Listando agendamentos com filtro de permissão");
        
        List<Agendamento> agendamentos = filtrarPorPermissao();
        
        return agendamentos.stream()
                .map(agendamento -> {
                    AgendamentoDTO dto = agendamentoMapper.toDTO(agendamento);
                    if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
                        dto.setServicos(agendamento.getServicos().stream()
                                .map(agendamentoServicoMapper::toDTO)
                                .collect(Collectors.toList()));
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }
    
    private List<Agendamento> filtrarPorPermissao() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return new ArrayList<>();
        }
        
        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        Usuario.PerfilUsuario perfil = usuario.getPerfil();
        
        List<Agendamento> agendamentos;

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN global: listando todos os agendamentos");
                agendamentos = agendamentoRepository.findAllWithServicos();
                break;

            case ADMINISTRADOR:
                // CRÍTICO (#125): ADMINISTRADOR NÃO pode ver agendamentos de outros tenants.
                // Filtra pelas unidades vinculadas ao seu adminUnicoId (o próprio id do usuário).
                log.debug("ADMINISTRADOR: listando agendamentos das unidades do próprio tenant");
                Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
                List<Unidade> unidadesDoTenant = unidadeRepository.findByAdminUnicoId(adminId);
                if (unidadesDoTenant.isEmpty()) {
                    log.warn("ADMINISTRADOR {} sem unidades vinculadas (adminUnicoId={})", email, adminId);
                    return new ArrayList<>();
                }
                Set<Long> unidadesAdmIds = unidadesDoTenant.stream().map(Unidade::getId).collect(Collectors.toSet());
                agendamentos = agendamentoRepository.findByUnidadeIdInWithServicos(unidadesAdmIds);
                break;

            case GERENTE:
                log.debug("GERENTE: listando agendamentos apenas das unidades vinculadas ao gerente");
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return new ArrayList<>();
                }
                Set<Long> unidadesGerenteIds = usuario.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
                agendamentos = agendamentoRepository.findByUnidadeIdInWithServicos(unidadesGerenteIds);
                break;

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando apenas agendamentos do próprio atendente");
                Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new BusinessException("Usuário não está vinculado a um atendente"));
                agendamentos = agendamentoRepository.findByAtendenteIdWithServicos(atendente.getId());
                break;

            case CLIENTE:
                log.debug("CLIENTE: listando apenas agendamentos do próprio cliente");
                agendamentos = clienteRepository.findByEmail(email)
                        .map(c -> agendamentoRepository.findByClienteIdWithServicos(c.getId()))
                        .orElse(new ArrayList<>());
                break;
            default:
                log.debug("Perfil desconhecido: retornando lista vazia");
                return new ArrayList<>();
        }

        return filtrarAgendamentosAtivos(agendamentos);
    }

    private List<Agendamento> filtrarAgendamentosAtivos(List<Agendamento> agendamentos) {
        return agendamentos.stream()
                .filter(a -> a.getStatus() != StatusAgendamento.CANCELADO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AgendamentoDTO buscarPorId(Long id) {
        log.debug("Buscando agendamento com id: {}", id);
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado com id: " + id));
        
        // Validar permissão para visualizar agendamento
        validarPermissaoVisualizarAgendamento(agendamento);
        
        // Força carregamento dos serviços
        if (agendamento.getServicos() != null) {
            agendamento.getServicos().size();
        }
        
        AgendamentoDTO dto = agendamentoMapper.toDTO(agendamento);
        
        // Mapeia serviços manualmente para garantir que estão no DTO
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            List<AgendamentoServicoDTO> servicosDTO = agendamento.getServicos().stream()
                    .map(agendamentoServicoMapper::toDTO)
                    .collect(Collectors.toList());
            dto.setServicos(servicosDTO);
        }
        
        return dto;
    }
    
    /**
     * True quando o agendamento está sendo criado pelo PRÓPRIO cliente
     * (perfil CLIENTE com Usuario OU cliente sem Usuario via /publico/clientes).
     * Usado pra pular checks que só fazem sentido pra ADMIN/GERENTE criando
     * agendamento PARA outro cliente.
     */
    private boolean ehClienteCriandoProprio(Long clienteIdAlvo) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        String email = auth.getName();
        Cliente cliente = clienteRepository.findByEmail(email).orElse(null);
        return cliente != null && cliente.getId().equals(clienteIdAlvo);
    }

    /**
     * True quando o cliente pode agendar nesta unidade:
     * 1. é a unidade principal (cliente.unidade.id == unidadeId)
     * 2. OU está nas unidades adicionais (cliente.unidades manyToMany)
     * 3. OU cliente NÃO TEM nenhuma unidade vinculada ainda (1º agendamento)
     */
    private boolean unidadeUnitadeDoCliente(Cliente cliente, Long unidadeId) {
        if (cliente.getUnidade() == null
                && (cliente.getUnidades() == null || cliente.getUnidades().isEmpty())) {
            return true; // 1º agendamento — agendar cria vínculo
        }
        if (cliente.getUnidade() != null && cliente.getUnidade().getId().equals(unidadeId)) {
            return true;
        }
        if (cliente.getUnidades() != null) {
            return cliente.getUnidades().stream().anyMatch(u -> u.getId().equals(unidadeId));
        }
        return false;
    }

    private void validarPermissaoCriarAgendamento(Long clienteId, Long unidadeId, Long atendenteId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }

        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        // Cliente sem Usuario associado (ex.: guest checkout — #131/#135):
        // auth.getName() é o email do cliente, mas não há registro em `usuarios`.
        // Trata como perfil CLIENTE buscando direto em `clientes`.
        if (usuario == null) {
            Cliente meuCliente = clienteRepository.findByEmail(email)
                    .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
            if (!meuCliente.getId().equals(clienteId)) {
                throw new BusinessException("Você só pode criar agendamentos para si mesmo");
            }
            // Cliente pode agendar na unidade principal OU em qualquer unidade vinculada (M-N).
            // Se NÃO tem nenhuma unidade ainda (1º agendamento) → libera; o agendamento
            // será o evento que cria o vínculo (a unidade do cliente é setada elsewhere).
            if (!unidadeUnitadeDoCliente(meuCliente, unidadeId)) {
                throw new BusinessException("Você não tem permissão para agendar nesta unidade");
            }
            return;
        }

        Usuario.PerfilUsuario perfil = usuario.getPerfil();

        switch (perfil) {
            case ADMIN:
            case ADMINISTRADOR:
                return;

            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    throw new BusinessException("Gerente não está vinculado a uma unidade");
                }
                Set<Long> unidadesGerenteIdsCriar = usuario.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
                if (!unidadesGerenteIdsCriar.contains(unidadeId)) {
                    throw new BusinessException("Você não tem permissão para criar agendamentos nesta unidade");
                }
                return;
                
            case PROFISSIONAL:
                Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new BusinessException("Usuário não está vinculado a um atendente"));
                if (!atendente.getId().equals(atendenteId)) {
                    throw new BusinessException("Você só pode criar agendamentos para si mesmo");
                }
                if (!atendente.getUnidade().getId().equals(unidadeId)) {
                    throw new BusinessException("Você não tem permissão para criar agendamentos nesta unidade");
                }
                return;
                
            case CLIENTE:
                Cliente meuCliente = clienteRepository.findByEmail(email)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado para seu usuário"));
                if (!meuCliente.getId().equals(clienteId)) {
                    throw new BusinessException("Você só pode criar agendamentos para si mesmo");
                }
                if (!unidadeUnitadeDoCliente(meuCliente, unidadeId)) {
                    throw new BusinessException("Você não tem permissão para agendar nesta unidade");
                }
                return;
            default:
                throw new BusinessException("Você não tem permissão para criar agendamentos");
        }
    }
    
    private Set<Long> obterUnidadesIdsPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Set.of();
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuario == null) {
            // Cliente sem Usuario (guest checkout #131/#135) — busca direto em `clientes`
            return clienteRepository.findByEmail(auth.getName())
                    .map(c -> {
                        Set<Long> ids = new java.util.HashSet<>();
                        if (c.getUnidade() != null) ids.add(c.getUnidade().getId());
                        if (c.getUnidades() != null) {
                            c.getUnidades().stream().map(Unidade::getId).forEach(ids::add);
                        }
                        return ids;
                    })
                    .orElse(Set.of());
        }
        switch (usuario.getPerfil()) {
            case ADMIN:
            case ADMINISTRADOR:
                return new java.util.HashSet<>(unidadeRepository.findAllIds());
            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    return Set.of();
                }
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            case PROFISSIONAL:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    return Set.of();
                }
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            case CLIENTE:
                return clienteRepository.findByEmail(auth.getName())
                        .map(c -> {
                            Set<Long> ids = new java.util.HashSet<>();
                            if (c.getUnidade() != null) ids.add(c.getUnidade().getId());
                            if (c.getUnidades() != null) {
                                c.getUnidades().stream().map(Unidade::getId).forEach(ids::add);
                            }
                            return ids;
                        })
                        .orElse(Set.of());
            default:
                return Set.of();
        }
    }
    
    private void validarPermissaoVisualizarAgendamento(Agendamento agendamento) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }

        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

        // CLIENTE sem Usuario associado (auth via clienteToken, ex.: seed
        // cliente@salao.demo.com OU guest checkout #131/#135). auth.getName()
        // é o email do cliente, mas não há registro em `usuarios` — busca em
        // `clientes` e valida que o agendamento é do próprio cliente.
        if (usuario == null) {
            Cliente meuCliente = clienteRepository.findByEmail(email).orElse(null);
            if (meuCliente == null) {
                throw new BusinessException("Usuário não encontrado");
            }
            if (agendamento.getCliente() == null
                    || !agendamento.getCliente().getId().equals(meuCliente.getId())) {
                throw new BusinessException("Você não tem permissão para visualizar este agendamento");
            }
            return;
        }
        
        Usuario.PerfilUsuario perfil = usuario.getPerfil();
        
        switch (perfil) {
            case ADMIN:
                // ADMIN global pode visualizar qualquer agendamento
                return;

            case ADMINISTRADOR:
                // CRÍTICO (reteste #3): ADMINISTRADOR só pode ver agendamentos do próprio tenant
                Long admIdAg = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
                Set<Long> unidadesAdmAg = unidadeRepository.findByAdminUnicoId(admIdAg)
                        .stream().map(Unidade::getId).collect(Collectors.toSet());
                if (agendamento.getUnidade() == null || !unidadesAdmAg.contains(agendamento.getUnidade().getId())) {
                    throw new ResourceNotFoundException("Agendamento não encontrado com id: " + agendamento.getId());
                }
                return;

            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    throw new BusinessException("Gerente não está vinculado a uma unidade");
                }
                Set<Long> unidadesGerenteIds = usuario.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
                if (agendamento.getUnidade() == null || !unidadesGerenteIds.contains(agendamento.getUnidade().getId())) {
                    throw new BusinessException("Você não tem permissão para visualizar este agendamento");
                }
                return;
                
            case PROFISSIONAL:
                Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new BusinessException("Usuário não está vinculado a um atendente"));
                if (!atendente.getId().equals(agendamento.getAtendente().getId())) {
                    throw new BusinessException("Você não tem permissão para visualizar este agendamento");
                }
                return;
                
            case CLIENTE:
                Cliente clienteVisualizar = clienteRepository.findByEmail(email)
                        .orElseThrow(() -> new BusinessException("Cliente não encontrado para seu usuário"));
                if (agendamento.getCliente() == null || !agendamento.getCliente().getId().equals(clienteVisualizar.getId())) {
                    throw new BusinessException("Você não tem permissão para visualizar este agendamento");
                }
                return;
            default:
                throw new BusinessException("Você não tem permissão para visualizar este agendamento");
        }
    }

    @Transactional
    public AgendamentoDTO criar(AgendamentoDTO agendamentoDTO) {
        log.debug("Criando novo agendamento: {}", agendamentoDTO);
        
        // Validações básicas
        if (agendamentoDTO.getServicos() == null || agendamentoDTO.getServicos().isEmpty()) {
            throw new BusinessException("É necessário informar pelo menos um serviço");
        }
        
        Cliente cliente = clienteRepository.findById(agendamentoDTO.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
        
        Unidade unidade = unidadeRepository.findById(agendamentoDTO.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        
        Atendente atendente = atendenteRepository.findById(agendamentoDTO.getAtendenteId())
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        
        validarPermissaoCriarAgendamento(cliente.getId(), unidade.getId(), atendente.getId());
        Set<Long> unidadesPermitidas = obterUnidadesIdsPermitidas();
        // Esse check secundário existe pra impedir ADMIN/GERENTE de criar agendamento
        // PARA cliente de outro tenant. Quando o próprio cliente está agendando
        // (perfil CLIENTE ou sem Usuario), pular — `validarPermissaoCriarAgendamento`
        // acima já validou e pode ser 1º agendamento (sem vínculo prévio).
        boolean clienteEhProprio = ehClienteCriandoProprio(cliente.getId());
        if (!clienteEhProprio
                && (cliente.getUnidade() == null
                    || !unidadesPermitidas.contains(cliente.getUnidade().getId()))) {
            throw new BusinessException("Cliente não pertence a uma unidade que você pode acessar");
        }
        
        if (!unidade.getAtivo()) {
            throw new BusinessException("Unidade não está ativa");
        }
        
        if (!atendente.getAtivo()) {
            throw new BusinessException("Atendente não está ativo");
        }
        
        // Valida que o atendente pode prestar os serviços
        List<Long> servicosIds = agendamentoDTO.getServicos().stream()
                .map(AgendamentoServicoDTO::getServicoId)
                .collect(Collectors.toList());
        
        List<Servico> servicos = servicoRepository.findAllById(servicosIds);
        if (servicos.size() != servicosIds.size()) {
            throw new ResourceNotFoundException("Um ou mais serviços não foram encontrados");
        }
        for (Servico s : servicos) {
            if (s.getUnidade() == null || !unidadesPermitidas.contains(s.getUnidade().getId())) {
                throw new BusinessException("Um ou mais serviços não pertencem a unidades que você pode acessar");
            }
        }
        
        // Verifica se atendente pode prestar os serviços
        List<Long> servicosDoAtendente = atendente.getServicos().stream()
                .map(Servico::getId)
                .collect(Collectors.toList());
        
        for (Long servicoId : servicosIds) {
            if (!servicosDoAtendente.contains(servicoId)) {
                throw new BusinessException("Atendente não está habilitado para prestar um dos serviços selecionados");
            }
        }
        
        // Calcula duração total e valor total
        int duracaoTotal = servicos.stream()
                .mapToInt(Servico::getDuracaoMinutos)
                .max()
                .orElse(30); // Default 30 minutos se não houver
        
        BigDecimal valorTotal = BigDecimal.ZERO;
        for (AgendamentoServicoDTO servicoDTO : agendamentoDTO.getServicos()) {
            Servico servico = servicos.stream()
                    .filter(s -> s.getId().equals(servicoDTO.getServicoId()))
                    .findFirst()
                    .orElseThrow();
            
            if (!servico.getAtivo()) {
                throw new BusinessException("Serviço " + servico.getNome() + " não está ativo");
            }
            
            BigDecimal valor = servicoDTO.getValor() != null ? servicoDTO.getValor() : servico.getValor();
            Integer quantidade = servicoDTO.getQuantidade() != null ? servicoDTO.getQuantidade() : 1;
            BigDecimal valorItem = valor.multiply(BigDecimal.valueOf(quantidade));
            
            servicoDTO.setValorTotal(valorItem);
            valorTotal = valorTotal.add(valorItem);
        }
        
        LocalDateTime dataHoraInicio = agendamentoDTO.getDataHoraInicio();
        LocalDateTime dataHoraFim = dataHoraInicio.plusMinutes(duracaoTotal);
        
        // Verifica se é agendamento recorrente
        RecorrenciaDTO recorrencia = agendamentoDTO.getRecorrencia();
        boolean isRecorrente = recorrencia != null && Boolean.TRUE.equals(recorrencia.getRecorrente());
        
        if (isRecorrente) {
            // Cria agendamentos recorrentes
            List<Agendamento> agendamentosRecorrentes = agendamentoRecorrenteService.criarAgendamentosRecorrentes(
                    agendamentoDTO,
                    recorrencia,
                    cliente,
                    unidade,
                    atendente,
                    servicos,
                    agendamentoDTO.getServicos(),
                    valorTotal,
                    duracaoTotal
            );
            
            if (agendamentosRecorrentes.isEmpty()) {
                throw new BusinessException("Não foi possível criar nenhum agendamento recorrente. Verifique conflitos de horário.");
            }
            
            log.info("Criados {} agendamentos recorrentes", agendamentosRecorrentes.size());
            return agendamentoMapper.toDTO(agendamentosRecorrentes.get(0)); // Retorna o primeiro
        }
        
        // Verifica conflito de horário (verifica sobreposição com outros agendamentos do mesmo atendente)
        if (agendamentoRepository.findConflitoHorario(atendente.getId(), dataHoraInicio, dataHoraFim).isPresent()) {
            throw new BusinessException("Já existe um agendamento neste horário para este atendente");
        }
        
        // Cria agendamento único
        Agendamento agendamento = agendamentoMapper.toEntity(agendamentoDTO);
        agendamento.setCliente(cliente);
        agendamento.setUnidade(unidade);
        agendamento.setAtendente(atendente);
        agendamento.setDataHoraInicio(dataHoraInicio);
        agendamento.setDataHoraFim(dataHoraFim);
        agendamento.setValorTotal(valorTotal);
        agendamento.setStatus(StatusAgendamento.AGENDADO);
        agendamento.setAgendamentoRecorrente(false);
        agendamento.setServicos(new ArrayList<>());
        
        agendamento = agendamentoRepository.save(agendamento);
        
        // Cria serviços do agendamento
        List<AgendamentoServico> agendamentoServicos = new ArrayList<>();
        for (AgendamentoServicoDTO servicoDTO : agendamentoDTO.getServicos()) {
            Servico servico = servicos.stream()
                    .filter(s -> s.getId().equals(servicoDTO.getServicoId()))
                    .findFirst()
                    .orElseThrow();
            
            AgendamentoServico agendamentoServico = AgendamentoServico.builder()
                    .agendamento(agendamento)
                    .servico(servico)
                    .valor(servicoDTO.getValor() != null ? servicoDTO.getValor() : servico.getValor())
                    .descricao(servicoDTO.getDescricao() != null ? servicoDTO.getDescricao() : servico.getDescricao())
                    .quantidade(servicoDTO.getQuantidade() != null ? servicoDTO.getQuantidade() : 1)
                    .valorTotal(servicoDTO.getValorTotal())
                    .build();
            
            agendamentoServicos.add(agendamentoServico);
        }
        
        agendamentoServicoRepository.saveAll(agendamentoServicos);
        agendamento.setServicos(agendamentoServicos);
        
        log.info("Agendamento criado com sucesso. ID: {}, Serviços: {}, Valor Total: {}",
                agendamento.getId(), agendamentoServicos.size(), valorTotal);

        lembreteAgendadoService.enviarConfirmacao(agendamento);

        return agendamentoMapper.toDTO(agendamento);
    }

    @Transactional
    public AgendamentoDTO atualizar(Long id, AgendamentoDTO agendamentoDTO) {
        log.debug("Atualizando agendamento: {}", id);

        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        validarPermissaoVisualizarAgendamento(agendamento);

        if (agendamento.getStatus() == StatusAgendamento.CANCELADO) {
            throw new BusinessException("Não é possível editar um agendamento cancelado");
        }
        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO) {
            throw new BusinessException("Não é possível editar um agendamento concluído");
        }

        if (agendamentoDTO.getServicos() == null || agendamentoDTO.getServicos().isEmpty()) {
            throw new BusinessException("É necessário informar pelo menos um serviço");
        }

        Cliente cliente = clienteRepository.findById(agendamentoDTO.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
        Unidade unidade = unidadeRepository.findById(agendamentoDTO.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        Atendente atendente = atendenteRepository.findById(agendamentoDTO.getAtendenteId())
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        validarPermissaoCriarAgendamento(cliente.getId(), unidade.getId(), atendente.getId());

        Set<Long> unidadesPermitidas = obterUnidadesIdsPermitidas();
        if (cliente.getUnidade() == null || !unidadesPermitidas.contains(cliente.getUnidade().getId())) {
            throw new BusinessException("Cliente não pertence a uma unidade que você pode acessar");
        }
        if (!unidade.getAtivo()) {
            throw new BusinessException("Unidade não está ativa");
        }
        if (!atendente.getAtivo()) {
            throw new BusinessException("Atendente não está ativo");
        }

        List<Long> servicosIds = agendamentoDTO.getServicos().stream()
                .map(AgendamentoServicoDTO::getServicoId)
                .collect(Collectors.toList());
        List<Servico> servicos = servicoRepository.findAllById(servicosIds);
        if (servicos.size() != servicosIds.size()) {
            throw new ResourceNotFoundException("Um ou mais serviços não foram encontrados");
        }
        for (Servico s : servicos) {
            if (s.getUnidade() == null || !unidadesPermitidas.contains(s.getUnidade().getId())) {
                throw new BusinessException("Um ou mais serviços não pertencem a unidades que você pode acessar");
            }
        }
        List<Long> servicosDoAtendente = atendente.getServicos().stream()
                .map(Servico::getId)
                .collect(Collectors.toList());
        for (Long servicoId : servicosIds) {
            if (!servicosDoAtendente.contains(servicoId)) {
                throw new BusinessException("Atendente não está habilitado para prestar um dos serviços selecionados");
            }
        }

        int duracaoTotal = servicos.stream()
                .mapToInt(Servico::getDuracaoMinutos)
                .max()
                .orElse(30);
        BigDecimal valorTotal = BigDecimal.ZERO;
        for (AgendamentoServicoDTO servicoDTO : agendamentoDTO.getServicos()) {
            Servico servico = servicos.stream()
                    .filter(s -> s.getId().equals(servicoDTO.getServicoId()))
                    .findFirst()
                    .orElseThrow();
            if (!servico.getAtivo()) {
                throw new BusinessException("Serviço " + servico.getNome() + " não está ativo");
            }
            BigDecimal valor = servicoDTO.getValor() != null ? servicoDTO.getValor() : servico.getValor();
            Integer quantidade = servicoDTO.getQuantidade() != null ? servicoDTO.getQuantidade() : 1;
            valorTotal = valorTotal.add(valor.multiply(BigDecimal.valueOf(quantidade)));
        }

        LocalDateTime dataHoraInicio = agendamentoDTO.getDataHoraInicio();
        LocalDateTime dataHoraFim = dataHoraInicio.plusMinutes(duracaoTotal);

        if (agendamentoRepository.findConflitoHorarioExcluindoId(atendente.getId(), dataHoraInicio, dataHoraFim, id).isPresent()) {
            throw new BusinessException("Já existe um agendamento neste horário para este atendente");
        }

        agendamento.setCliente(cliente);
        agendamento.setUnidade(unidade);
        agendamento.setAtendente(atendente);
        agendamento.setDataHoraInicio(dataHoraInicio);
        agendamento.setDataHoraFim(dataHoraFim);
        agendamento.setValorTotal(valorTotal);
        agendamento.setObservacoes(agendamentoDTO.getObservacoes());

        agendamentoServicoRepository.deleteByAgendamentoId(agendamento.getId());
        List<AgendamentoServico> agendamentoServicos = new ArrayList<>();
        for (AgendamentoServicoDTO servicoDTO : agendamentoDTO.getServicos()) {
            Servico servico = servicos.stream()
                    .filter(s -> s.getId().equals(servicoDTO.getServicoId()))
                    .findFirst()
                    .orElseThrow();
            BigDecimal valor = servicoDTO.getValor() != null ? servicoDTO.getValor() : servico.getValor();
            Integer quantidade = servicoDTO.getQuantidade() != null ? servicoDTO.getQuantidade() : 1;
            BigDecimal valorItem = valor.multiply(BigDecimal.valueOf(quantidade));
            AgendamentoServico agendamentoServico = AgendamentoServico.builder()
                    .agendamento(agendamento)
                    .servico(servico)
                    .valor(valor)
                    .descricao(servicoDTO.getDescricao() != null ? servicoDTO.getDescricao() : servico.getDescricao())
                    .quantidade(quantidade)
                    .valorTotal(valorItem)
                    .build();
            agendamentoServicos.add(agendamentoServico);
        }
        agendamentoServicoRepository.saveAll(agendamentoServicos);
        agendamento.setServicos(agendamentoServicos);
        agendamento = agendamentoRepository.save(agendamento);

        log.info("Agendamento atualizado. ID: {}", id);
        AgendamentoDTO dto = agendamentoMapper.toDTO(agendamento);
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            dto.setServicos(agendamento.getServicos().stream()
                    .map(agendamentoServicoMapper::toDTO)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    @Transactional
    public AgendamentoDTO atualizarStatus(Long id, StatusAgendamento novoStatus) {
        log.debug("Atualizando status do agendamento {} para {}", id, novoStatus);
        
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        StatusAgendamento statusAtual = agendamento.getStatus() != null
                ? agendamento.getStatus()
                : StatusAgendamento.AGENDADO;
        
        // Validar permissão para atualizar agendamento
        validarPermissaoVisualizarAgendamento(agendamento);
        validarTransicaoStatus(agendamento, novoStatus);
        
        if (novoStatus == StatusAgendamento.EM_ANDAMENTO) {
            validarClienteSemOutroAtendimentoEmAndamento(agendamento);
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                usuarioRepository.findByEmail(auth.getName())
                        .flatMap(usuario -> atendenteRepository.findByUsuarioId(usuario.getId()))
                        .ifPresent(agendamento::setAtendente);
            }
        }
        if (statusAtual == StatusAgendamento.CONFIRMADO && novoStatus == StatusAgendamento.AGENDADO) {
            validarRetornoParaAgendadoSemSinalNoGrupo(agendamento);
        }

        agendamento.setStatus(novoStatus);
        agendamento = agendamentoRepository.save(agendamento);
        if (statusAtual == StatusAgendamento.AGENDADO && novoStatus == StatusAgendamento.CONFIRMADO) {
            sincronizarConfirmacaoDoDia(agendamento);
        }
        if (statusAtual == StatusAgendamento.CONFIRMADO && novoStatus == StatusAgendamento.AGENDADO) {
            sincronizarRetornoParaAgendadoDoDia(agendamento);
        }
        log.info("Status do agendamento atualizado. ID: {}, Status: {}", id, novoStatus);
        return agendamentoMapper.toDTO(agendamento);
    }

    private void validarTransicaoStatus(Agendamento agendamento, StatusAgendamento novoStatus) {
        if (novoStatus == null) {
            throw new BusinessException("Status do agendamento é obrigatório");
        }

        StatusAgendamento statusAtual = agendamento.getStatus() != null
                ? agendamento.getStatus()
                : StatusAgendamento.AGENDADO;

        if (statusAtual == novoStatus) {
            return;
        }

        // Esses fluxos têm regras próprias e devem usar endpoints dedicados
        if (novoStatus == StatusAgendamento.CANCELADO) {
            throw new BusinessException("Use a ação de cancelar agendamento para definir status cancelado");
        }
        if (novoStatus == StatusAgendamento.CONCLUIDO) {
            throw new BusinessException("Use a ação de finalizar atendimento para concluir o agendamento");
        }

        switch (statusAtual) {
            case AGENDADO:
                if (novoStatus == StatusAgendamento.CONFIRMADO) return;
                break;
            case CONFIRMADO:
                if (novoStatus == StatusAgendamento.AGENDADO
                        || novoStatus == StatusAgendamento.EM_ANDAMENTO
                        || novoStatus == StatusAgendamento.NO_SHOW) {
                    return;
                }
                break;
            case EM_ANDAMENTO:
                if (novoStatus == StatusAgendamento.PROCEDIMENTO_FIM) return;
                break;
            case PROCEDIMENTO_FIM:
                throw new BusinessException("Use a ação de finalizar atendimento para concluir o agendamento");
            case CANCELADO:
            case CONCLUIDO:
            case NO_SHOW:
                throw new BusinessException("Não é possível alterar status de um agendamento encerrado");
            default:
                break;
        }

        throw new BusinessException(String.format(
                "Transição de status inválida: %s -> %s",
                statusAtual.name(), novoStatus.name()
        ));
    }

    private void validarClienteSemOutroAtendimentoEmAndamento(Agendamento agendamento) {
        if (agendamento.getId() == null
                || agendamento.getCliente() == null
                || agendamento.getCliente().getId() == null
                || agendamento.getUnidade() == null
                || agendamento.getUnidade().getId() == null
                || agendamento.getDataHoraInicio() == null) {
            return;
        }

        LocalDate dataAgendamento = agendamento.getDataHoraInicio().toLocalDate();
        LocalDateTime inicioDia = dataAgendamento.atStartOfDay();
        LocalDateTime fimDia = dataAgendamento.plusDays(1).atStartOfDay();

        Optional<Agendamento> conflito = agendamentoRepository
                .findFirstByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNotOrderByDataHoraInicioAsc(
                        agendamento.getCliente().getId(),
                        agendamento.getUnidade().getId(),
                        StatusAgendamento.EM_ANDAMENTO,
                        inicioDia,
                        fimDia,
                        agendamento.getId()
                );

        if (conflito.isPresent()) {
            Agendamento agendamentoConflitante = conflito.get();
            String nomeProfissional = "outro profissional";
            if (agendamentoConflitante.getAtendente() != null
                    && agendamentoConflitante.getAtendente().getUsuario() != null
                    && agendamentoConflitante.getAtendente().getUsuario().getNome() != null
                    && !agendamentoConflitante.getAtendente().getUsuario().getNome().isBlank()) {
                nomeProfissional = agendamentoConflitante.getAtendente().getUsuario().getNome();
            }

            throw new BusinessException("Cliente já está em atendimento por " + nomeProfissional);
        }
    }

    private void sincronizarConfirmacaoDoDia(Agendamento agendamentoConfirmado) {
        if (agendamentoConfirmado.getId() == null
                || agendamentoConfirmado.getCliente() == null
                || agendamentoConfirmado.getCliente().getId() == null
                || agendamentoConfirmado.getUnidade() == null
                || agendamentoConfirmado.getUnidade().getId() == null
                || agendamentoConfirmado.getDataHoraInicio() == null) {
            return;
        }

        LocalDate dataAgendamento = agendamentoConfirmado.getDataHoraInicio().toLocalDate();
        LocalDateTime inicioDia = dataAgendamento.atStartOfDay();
        LocalDateTime fimDia = dataAgendamento.plusDays(1).atStartOfDay();

        List<Agendamento> agendamentosPendentes = agendamentoRepository
                .findByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNot(
                        agendamentoConfirmado.getCliente().getId(),
                        agendamentoConfirmado.getUnidade().getId(),
                        StatusAgendamento.AGENDADO,
                        inicioDia,
                        fimDia,
                        agendamentoConfirmado.getId()
                );

        if (agendamentosPendentes.isEmpty()) {
            return;
        }

        agendamentosPendentes.forEach(item -> item.setStatus(StatusAgendamento.CONFIRMADO));
        agendamentoRepository.saveAll(agendamentosPendentes);
        log.info("Confirmação sincronizada para {} agendamento(s) do cliente {} no dia {}",
                agendamentosPendentes.size(),
                agendamentoConfirmado.getCliente().getId(),
                dataAgendamento);
    }

    private void validarRetornoParaAgendadoSemSinalNoGrupo(Agendamento agendamento) {
        if (agendamento.getCliente() == null
                || agendamento.getCliente().getId() == null
                || agendamento.getUnidade() == null
                || agendamento.getUnidade().getId() == null
                || agendamento.getDataHoraInicio() == null) {
            return;
        }

        LocalDate dataAgendamento = agendamento.getDataHoraInicio().toLocalDate();
        LocalDateTime inicioDia = dataAgendamento.atStartOfDay();
        LocalDateTime fimDia = dataAgendamento.plusDays(1).atStartOfDay();

        boolean existeSinalConfirmadoNoGrupo = agendamentoRepository
                .existsByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndValorFinalGreaterThan(
                        agendamento.getCliente().getId(),
                        agendamento.getUnidade().getId(),
                        StatusAgendamento.CONFIRMADO,
                        inicioDia,
                        fimDia,
                        BigDecimal.ZERO
                );

        if (existeSinalConfirmadoNoGrupo) {
            throw new BusinessException("Não é possível voltar para agendado: existe sinal registrado neste dia para a cliente");
        }
    }

    private void sincronizarRetornoParaAgendadoDoDia(Agendamento agendamentoRetornado) {
        if (agendamentoRetornado.getId() == null
                || agendamentoRetornado.getCliente() == null
                || agendamentoRetornado.getCliente().getId() == null
                || agendamentoRetornado.getUnidade() == null
                || agendamentoRetornado.getUnidade().getId() == null
                || agendamentoRetornado.getDataHoraInicio() == null) {
            return;
        }

        LocalDate dataAgendamento = agendamentoRetornado.getDataHoraInicio().toLocalDate();
        LocalDateTime inicioDia = dataAgendamento.atStartOfDay();
        LocalDateTime fimDia = dataAgendamento.plusDays(1).atStartOfDay();

        List<Agendamento> agendamentosConfirmadosNoGrupo = agendamentoRepository
                .findByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNot(
                        agendamentoRetornado.getCliente().getId(),
                        agendamentoRetornado.getUnidade().getId(),
                        StatusAgendamento.CONFIRMADO,
                        inicioDia,
                        fimDia,
                        agendamentoRetornado.getId()
                );

        if (agendamentosConfirmadosNoGrupo.isEmpty()) {
            return;
        }

        agendamentosConfirmadosNoGrupo.forEach(item -> item.setStatus(StatusAgendamento.AGENDADO));
        agendamentoRepository.saveAll(agendamentosConfirmadosNoGrupo);
        log.info("Retorno para agendado sincronizado para {} agendamento(s) do cliente {} no dia {}",
                agendamentosConfirmadosNoGrupo.size(),
                agendamentoRetornado.getCliente().getId(),
                dataAgendamento);
    }

    @Transactional
    public AgendamentoDTO atualizarObservacao(Long id, String observacoes) {
        log.debug("Atualizando observação do agendamento {}", id);

        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));

        validarPermissaoVisualizarAgendamento(agendamento);

        agendamento.setObservacoes(observacoes);
        agendamento = agendamentoRepository.save(agendamento);

        AgendamentoDTO dto = agendamentoMapper.toDTO(agendamento);
        if (agendamento.getServicos() != null && !agendamento.getServicos().isEmpty()) {
            dto.setServicos(agendamento.getServicos().stream()
                    .map(agendamentoServicoMapper::toDTO)
                    .collect(Collectors.toList()));
        }

        log.info("Observação do agendamento atualizada. ID: {}", id);
        return dto;
    }

    @Transactional
    public void cancelar(Long id) {
        log.debug("Cancelando agendamento com id: {}", id);
        
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        
        // Validar permissão para cancelar agendamento
        validarPermissaoVisualizarAgendamento(agendamento);
        
        if (agendamento.getStatus() == StatusAgendamento.CANCELADO) {
            throw new BusinessException("Agendamento já está cancelado");
        }
        
        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO) {
            throw new BusinessException("Não é possível cancelar um agendamento concluído");
        }

        if (agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Não é possível cancelar um agendamento marcado como não comparecimento");
        }
        
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado com sucesso. ID: {}", id);
    }

    @Transactional
    public void excluir(Long id) {
        log.debug("Excluindo agendamento com id: {}", id);

        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));

        // Reaproveita a regra de visualização para garantir isolamento por perfil/unidade
        validarPermissaoVisualizarAgendamento(agendamento);

        BigDecimal valorSinalAgendamento = agendamento.getValorFinal() != null
                ? agendamento.getValorFinal()
                : BigDecimal.ZERO;
        BigDecimal valorSinalPagamento = pagamentoRepository.findByAgendamentoId(id)
                .map(pagamento -> pagamento.getValor() != null ? pagamento.getValor() : BigDecimal.ZERO)
                .orElse(BigDecimal.ZERO);
        BigDecimal valorSinal = valorSinalAgendamento.max(valorSinalPagamento);

        if (valorSinal.compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessException("Não é possível excluir agendamento com sinal pago");
        }

        agendamentoServicoRepository.deleteByAgendamentoId(id);
        pagamentoRepository.deleteByAgendamentoId(id);
        notaFiscalRepository.deleteByAgendamentoId(id);
        agendamentoRepository.deleteById(id);

        log.info("Agendamento excluído com sucesso. ID: {}", id);
    }

    @Transactional
    public AgendamentoDTO finalizar(Long id, FinalizarAgendamentoDTO finalizarDTO) {
        log.debug("Finalizando agendamento {} com valor: {}", id, finalizarDTO.getValorFinal());
        
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        
        // Validar permissão para finalizar agendamento
        validarPermissaoVisualizarAgendamento(agendamento);
        
        if (agendamento.getStatus() == StatusAgendamento.CONCLUIDO) {
            throw new BusinessException("Agendamento já está concluído");
        }
        
        if (agendamento.getStatus() == StatusAgendamento.CANCELADO) {
            throw new BusinessException("Não é possível finalizar um agendamento cancelado");
        }

        if (agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Não é possível finalizar um agendamento marcado como não comparecimento");
        }
        
        BigDecimal valorPagamentoFinal = finalizarDTO.getValorFinal() != null ? finalizarDTO.getValorFinal() : BigDecimal.ZERO;
        if (valorPagamentoFinal.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Valor final não pode ser negativo");
        }

        BigDecimal valorPagoAtual = agendamento.getValorFinal() != null ? agendamento.getValorFinal() : BigDecimal.ZERO;
        BigDecimal novoTotalPago = valorPagoAtual.add(valorPagamentoFinal);
        BigDecimal valorTotalAgendamento = agendamento.getValorTotal() != null ? agendamento.getValorTotal() : BigDecimal.ZERO;

        if (novoTotalPago.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Informe um valor para pagamento ou registre um pagamento prévio");
        }

        if (novoTotalPago.compareTo(valorTotalAgendamento) > 0) {
            BigDecimal valorRestante = valorTotalAgendamento.subtract(valorPagoAtual);
            throw new BusinessException("Valor informado excede o restante do agendamento: " + valorRestante);
        }

        if (valorPagamentoFinal.compareTo(BigDecimal.ZERO) > 0) {
            Optional<Pagamento> pagamentoExistente = pagamentoRepository.findByAgendamentoId(id);
            Pagamento pagamento = pagamentoExistente.orElse(null);
            if (pagamento == null) {
                pagamento = Pagamento.builder()
                        .agendamento(agendamento)
                        .build();
            }

            TipoPagamento tipoPagamentoFinal = finalizarDTO.getTipoPagamento();
            if (tipoPagamentoFinal == null) {
                tipoPagamentoFinal = pagamento.getTipoPagamento();
            }
            if (tipoPagamentoFinal == null) {
                tipoPagamentoFinal = TipoPagamento.DINHEIRO;
            }

            pagamento.setTipoPagamento(tipoPagamentoFinal);
            pagamento.setValor(novoTotalPago);
            pagamento.setStatus(StatusPagamento.APROVADO);
            pagamento.setDataPagamento(LocalDateTime.now());
            pagamentoRepository.save(pagamento);
        }

        agendamento.setStatus(StatusAgendamento.CONCLUIDO);
        agendamento.setValorFinal(novoTotalPago);
        agendamento = agendamentoRepository.save(agendamento);
        
        log.info("Agendamento finalizado com sucesso. ID: {}, Pago total: {}", id, novoTotalPago);

        // Emite nota fiscal automaticamente apenas se a unidade tem NotaFácil ativo
        boolean notafacilAtivo = Boolean.TRUE.equals(agendamento.getUnidade().getNotafacilAtivo());
        if (notafacilAtivo) {
            log.info("Disparando emissão de NFS-e via NotaFácil para agendamento {}", id);
            notaFiscalService.emitirNotaFiscal(agendamento.getId());
        } else {
            log.debug("NotaFácil não ativo para a unidade — NFS-e não emitida automaticamente (agendamento {})", id);
        }
        
        return agendamentoMapper.toDTO(agendamento);
    }
}
