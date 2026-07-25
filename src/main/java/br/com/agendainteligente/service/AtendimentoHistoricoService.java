package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.AtendimentoHistorico;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.AtendimentoHistoricoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.AtendimentoHistoricoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/** #174: CRUD do histórico de atendimentos da cliente, escopado por tenant. */
@Service
@RequiredArgsConstructor
@Slf4j
public class AtendimentoHistoricoService {

    private final AtendimentoHistoricoRepository repository;
    private final ClienteRepository clienteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<AtendimentoHistoricoDTO> listarPorCliente(Long clienteId) {
        Set<Long> permitidas = obterUnidadesIdsPermitidas();
        List<AtendimentoHistorico> lista = repository.findByClienteIdOrderByDataAscIdAsc(clienteId);
        if (permitidas != null) { // null = ADMIN global (sem filtro)
            lista = lista.stream()
                    .filter(a -> a.getUnidade() != null && permitidas.contains(a.getUnidade().getId()))
                    .collect(Collectors.toList());
        }
        return lista.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public AtendimentoHistoricoDTO criar(AtendimentoHistoricoDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado"));
        AtendimentoHistorico a = new AtendimentoHistorico();
        a.setCliente(cliente);
        a.setUnidade(resolverUnidadeDoUsuarioLogado());
        aplicarCampos(a, dto);
        a = repository.save(a);
        log.info("Atendimento de histórico criado. ID: {}, cliente: {}", a.getId(), cliente.getId());
        return toDTO(a);
    }

    @Transactional
    public AtendimentoHistoricoDTO atualizar(Long id, AtendimentoHistoricoDTO dto) {
        AtendimentoHistorico a = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendimento não encontrado"));
        validarAcesso(a);
        // cliente e unidade não mudam
        aplicarCampos(a, dto);
        a = repository.save(a);
        log.info("Atendimento de histórico atualizado. ID: {}", id);
        return toDTO(a);
    }

    @Transactional
    public void excluir(Long id) {
        AtendimentoHistorico a = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendimento não encontrado"));
        validarAcesso(a);
        repository.delete(a);
        log.info("Atendimento de histórico excluído. ID: {}", id);
    }

    private void aplicarCampos(AtendimentoHistorico a, AtendimentoHistoricoDTO dto) {
        a.setData(dto.getData());
        a.setAvaliacaoInicial(dto.getAvaliacaoInicial());
        a.setProcedimento(dto.getProcedimento());
        a.setOrientacoes(dto.getOrientacoes());
        a.setObservacoes(dto.getObservacoes());
        a.setFotos(dto.getFotos());
        a.setProximaManutencao(dto.getProximaManutencao());
    }

    /** SEC: o registro tem que estar numa unidade que o usuário logado acessa. */
    private void validarAcesso(AtendimentoHistorico a) {
        Set<Long> permitidas = obterUnidadesIdsPermitidas();
        if (permitidas == null) return; // ADMIN global
        Long unidadeId = a.getUnidade() != null ? a.getUnidade().getId() : null;
        if (unidadeId == null || !permitidas.contains(unidadeId)) {
            throw new ResourceNotFoundException("Atendimento não encontrado");
        }
    }

    /** `null` = ADMIN global (sem filtro); vazio = sem acesso a nada. */
    private Set<Long> obterUnidadesIdsPermitidas() {
        Usuario usuario = getUsuarioLogado();
        switch (usuario.getPerfil()) {
            case ADMIN:
                return null;
            case ADMINISTRADOR: {
                Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
                return unidadeRepository.findByAdminUnicoId(adminId).stream()
                        .map(Unidade::getId).collect(Collectors.toSet());
            }
            case GERENTE: {
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) return Set.of();
                List<Long> gerenteUnidadeIds = usuario.getUnidades().stream()
                        .map(Unidade::getId).collect(Collectors.toList());
                Set<Long> empresaIds = new java.util.HashSet<>(
                        unidadeRepository.findEmpresaIdsByIds(gerenteUnidadeIds));
                if (empresaIds.isEmpty()) return Set.of();
                return unidadeRepository.findByEmpresaIdIn(empresaIds).stream()
                        .map(Unidade::getId).collect(Collectors.toSet());
            }
            case PROFISSIONAL:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) return Set.of();
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default:
                return Set.of();
        }
    }

    private Unidade resolverUnidadeDoUsuarioLogado() {
        Usuario usuario = getUsuarioLogado();
        if (usuario.getUnidades() != null && !usuario.getUnidades().isEmpty()) {
            return usuario.getUnidades().get(0);
        }
        // ADMINISTRADOR sem vínculo direto: primeira unidade do tenant
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        return unidadeRepository.findByAdminUnicoId(adminId).stream().findFirst().orElse(null);
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private AtendimentoHistoricoDTO toDTO(AtendimentoHistorico a) {
        return AtendimentoHistoricoDTO.builder()
                .id(a.getId())
                .clienteId(a.getCliente() != null ? a.getCliente().getId() : null)
                .clienteNome(a.getCliente() != null ? a.getCliente().getNome() : null)
                .data(a.getData())
                .avaliacaoInicial(a.getAvaliacaoInicial())
                .procedimento(a.getProcedimento())
                .orientacoes(a.getOrientacoes())
                .observacoes(a.getObservacoes())
                .fotos(a.getFotos())
                .proximaManutencao(a.getProximaManutencao())
                .dataCriacao(a.getDataCriacao())
                .dataAtualizacao(a.getDataAtualizacao())
                .build();
    }
}
