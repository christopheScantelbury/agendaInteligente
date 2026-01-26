package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
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
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
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

    @Transactional(readOnly = true)
    public List<AgendamentoDTO> listarTodos() {
        log.debug("Listando agendamentos com filtro de permissão");
        
        List<Agendamento> agendamentos = filtrarPorPermissao();
        
        return agendamentos.stream()
                .map(agendamento -> {
                    // Força carregamento dos serviços
                    if (agendamento.getServicos() != null) {
                        agendamento.getServicos().size();
                    }
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
        
        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os agendamentos");
                return agendamentoRepository.findAll();
                
            case GERENTE:
                log.debug("GERENTE: listando agendamentos das unidades do gerente");
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return new ArrayList<>();
                }
                
                // Obter IDs das empresas das unidades do gerente
                Set<Long> empresaIds = usuario.getUnidades().stream()
                        .map(u -> {
                            if (u.getEmpresa() == null) {
                                Unidade unidadeCompleta = unidadeRepository.findById(u.getId())
                                        .orElse(null);
                                if (unidadeCompleta != null && unidadeCompleta.getEmpresa() != null) {
                                    return unidadeCompleta.getEmpresa().getId();
                                }
                                return null;
                            }
                            return u.getEmpresa().getId();
                        })
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                
                if (empresaIds.isEmpty()) {
                    log.warn("Gerente {} não tem empresas vinculadas", email);
                    return new ArrayList<>();
                }
                
                // Obter IDs de todas as unidades das mesmas empresas
                List<Unidade> todasUnidades = unidadeRepository.findAll();
                List<Long> unidadesIds = todasUnidades.stream()
                        .filter(u -> {
                            if (u.getEmpresa() == null) {
                                return false;
                            }
                            return empresaIds.contains(u.getEmpresa().getId());
                        })
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                
                // Retornar agendamentos de todas as unidades da mesma empresa
                return agendamentoRepository.findAll().stream()
                        .filter(a -> unidadesIds.contains(a.getUnidade().getId()))
                        .collect(Collectors.toList());
                
            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando apenas agendamentos do próprio atendente");
                Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId())
                        .orElseThrow(() -> new BusinessException("Usuário não está vinculado a um atendente"));
                return agendamentoRepository.findByAtendenteId(atendente.getId());
                
            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia (deve usar endpoint público)");
                return new ArrayList<>();
        }
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
    
    private void validarPermissaoCriarAgendamento(Long unidadeId, Long atendenteId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }
        
        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        Usuario.PerfilUsuario perfil = usuario.getPerfil();
        
        switch (perfil) {
            case ADMIN:
                // ADMIN pode criar agendamentos em qualquer unidade/atendente
                return;
                
            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    throw new BusinessException("Gerente não está vinculado a uma unidade");
                }
                
                // Obter IDs das empresas das unidades do gerente
                Set<Long> empresaIds = usuario.getUnidades().stream()
                        .map(u -> {
                            if (u.getEmpresa() == null) {
                                Unidade unidadeCompleta = unidadeRepository.findById(u.getId())
                                        .orElse(null);
                                if (unidadeCompleta != null && unidadeCompleta.getEmpresa() != null) {
                                    return unidadeCompleta.getEmpresa().getId();
                                }
                                return null;
                            }
                            return u.getEmpresa().getId();
                        })
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                
                // Verificar se a unidade do agendamento pertence a uma das empresas do gerente
                Unidade unidadeAgendamento = unidadeRepository.findById(unidadeId)
                        .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
                
                if (unidadeAgendamento.getEmpresa() == null || 
                    !empresaIds.contains(unidadeAgendamento.getEmpresa().getId())) {
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
            default:
                throw new BusinessException("Você não tem permissão para criar agendamentos");
        }
    }
    
    private void validarPermissaoVisualizarAgendamento(Agendamento agendamento) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }
        
        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        Usuario.PerfilUsuario perfil = usuario.getPerfil();
        
        switch (perfil) {
            case ADMIN:
                // ADMIN pode visualizar qualquer agendamento
                return;
                
            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    throw new BusinessException("Gerente não está vinculado a uma unidade");
                }
                
                // Obter IDs das empresas das unidades do gerente
                Set<Long> empresaIds = usuario.getUnidades().stream()
                        .map(u -> {
                            if (u.getEmpresa() == null) {
                                Unidade unidadeCompleta = unidadeRepository.findById(u.getId())
                                        .orElse(null);
                                if (unidadeCompleta != null && unidadeCompleta.getEmpresa() != null) {
                                    return unidadeCompleta.getEmpresa().getId();
                                }
                                return null;
                            }
                            return u.getEmpresa().getId();
                        })
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                
                // Verificar se a unidade do agendamento pertence a uma das empresas do gerente
                if (agendamento.getUnidade() == null || agendamento.getUnidade().getEmpresa() == null ||
                    !empresaIds.contains(agendamento.getUnidade().getEmpresa().getId())) {
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
        
        // Validar permissão para criar agendamento
        validarPermissaoCriarAgendamento(unidade.getId(), atendente.getId());
        
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
        
        return agendamentoMapper.toDTO(agendamento);
    }

    @Transactional
    public AgendamentoDTO atualizarStatus(Long id, StatusAgendamento novoStatus) {
        log.debug("Atualizando status do agendamento {} para {}", id, novoStatus);
        
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        
        // Validar permissão para atualizar agendamento
        validarPermissaoVisualizarAgendamento(agendamento);
        
        agendamento.setStatus(novoStatus);
        agendamento = agendamentoRepository.save(agendamento);
        log.info("Status do agendamento atualizado. ID: {}, Status: {}", id, novoStatus);
        return agendamentoMapper.toDTO(agendamento);
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
        
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        agendamentoRepository.save(agendamento);
        log.info("Agendamento cancelado com sucesso. ID: {}", id);
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
        
        BigDecimal valorFinal = finalizarDTO.getValorFinal();
        if (valorFinal.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Valor final deve ser maior que zero");
        }
        
        agendamento.setStatus(StatusAgendamento.CONCLUIDO);
        agendamento.setValorFinal(valorFinal);
        agendamento = agendamentoRepository.save(agendamento);
        
        log.info("Agendamento finalizado com sucesso. ID: {}, Valor: {}", id, valorFinal);
        
        // Emite nota fiscal automaticamente
        notaFiscalService.emitirNotaFiscal(agendamento.getId());
        
        return agendamentoMapper.toDTO(agendamento);
    }
}

