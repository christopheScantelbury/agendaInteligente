package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.CategoriaDespesa;
import br.com.agendainteligente.domain.entity.Despesa;
import br.com.agendainteligente.domain.entity.DespesaAuditoria;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.enums.RecorrenciaDespesa;
import br.com.agendainteligente.domain.enums.StatusDespesa;
import br.com.agendainteligente.dto.DespesaDTO;
import br.com.agendainteligente.dto.DespesaResumoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.CategoriaDespesaRepository;
import br.com.agendainteligente.repository.DespesaAuditoriaRepository;
import br.com.agendainteligente.repository.DespesaRepository;
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
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DespesaService {

    private final DespesaRepository despesaRepository;
    private final DespesaAuditoriaRepository auditoriaRepository;
    private final CategoriaDespesaRepository categoriaRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<DespesaDTO> listar(LocalDate inicio, LocalDate fim, Long unidadeId, String statusFiltro, String busca) {
        Set<Long> permitidas = unidadesPermitidas();
        if (permitidas.isEmpty()) return List.of();
        Collection<Long> alvo = unidadeId != null && permitidas.contains(unidadeId)
                ? List.of(unidadeId)
                : permitidas;

        List<Despesa> despesas = inicio != null && fim != null
                ? despesaRepository.findByPeriodo(alvo, inicio, fim)
                : despesaRepository.findByUnidadeIdInOrderByDataVencimentoDesc(alvo);

        LocalDate hoje = LocalDate.now();
        return despesas.stream()
                .filter(d -> aplicarFiltroStatus(d, statusFiltro, hoje))
                .filter(d -> aplicarBusca(d, busca))
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DespesaResumoDTO resumo(LocalDate inicio, LocalDate fim, Long unidadeId) {
        Set<Long> permitidas = unidadesPermitidas();
        if (permitidas.isEmpty()) return DespesaResumoDTO.builder().build();
        Collection<Long> alvo = unidadeId != null && permitidas.contains(unidadeId)
                ? List.of(unidadeId)
                : permitidas;
        LocalDate i = inicio != null ? inicio : LocalDate.now().withDayOfMonth(1);
        LocalDate f = fim != null ? fim : i.plusMonths(1).minusDays(1);

        BigDecimal rascunho = despesaRepository.somarPorStatusEPeriodo(alvo, StatusDespesa.RASCUNHO, i, f);
        BigDecimal aprovada = despesaRepository.somarPorStatusEPeriodo(alvo, StatusDespesa.APROVADA, i, f);
        BigDecimal paga = despesaRepository.somarPorStatusEPeriodo(alvo, StatusDespesa.PAGA, i, f);
        BigDecimal cancelada = despesaRepository.somarPorStatusEPeriodo(alvo, StatusDespesa.CANCELADA, i, f);
        BigDecimal total = rascunho.add(aprovada).add(paga); // cancelada não conta no total

        LocalDate hoje = LocalDate.now();
        long vencidas = despesaRepository.findByPeriodo(alvo, i, f).stream()
                .filter(d -> d.getStatus() != StatusDespesa.PAGA && d.getStatus() != StatusDespesa.CANCELADA)
                .filter(d -> d.getDataVencimento().isBefore(hoje))
                .count();

        return DespesaResumoDTO.builder()
                .totalRascunho(rascunho)
                .totalAprovada(aprovada)
                .totalPaga(paga)
                .totalCancelada(cancelada)
                .totalGeral(total)
                .quantidadeVencidas(vencidas)
                .build();
    }

    @Transactional(readOnly = true)
    public DespesaDTO buscarPorId(Long id) {
        Despesa d = despesaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        if (!unidadesPermitidas().contains(d.getUnidade().getId())) {
            throw new ResourceNotFoundException("Despesa não encontrada");
        }
        return toDTO(d);
    }

    @Transactional
    public DespesaDTO criar(DespesaDTO dto) {
        Usuario logado = usuarioLogado();
        validarEdicao(logado);
        Unidade unidade = unidadeRepository.findById(dto.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        if (!unidadesPermitidas().contains(unidade.getId())) {
            throw new BusinessException("Sem permissão na unidade selecionada");
        }
        CategoriaDespesa categoria = categoriaRepository.findById(dto.getCategoriaId())
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));

        Despesa despesa = Despesa.builder()
                .nome(dto.getNome().trim())
                .descricao(dto.getDescricao())
                .valor(dto.getValor())
                .dataCompetencia(dto.getDataCompetencia())
                .dataVencimento(dto.getDataVencimento())
                .dataPagamento(dto.getDataPagamento())
                .categoria(categoria)
                .unidade(unidade)
                .adminUnicoId(adminUnicoIdDo(logado))
                .fornecedor(dto.getFornecedor())
                .formaPagamento(dto.getFormaPagamento())
                .status(dto.getStatus() != null ? dto.getStatus() : StatusDespesa.RASCUNHO)
                .recorrencia(dto.getRecorrencia() != null ? dto.getRecorrencia() : RecorrenciaDespesa.NENHUMA)
                .reembolsavel(Boolean.TRUE.equals(dto.getReembolsavel()))
                .centroCusto(dto.getCentroCusto())
                .criadoPorId(logado.getId())
                .atualizadoPorId(logado.getId())
                .build();
        validarDatas(despesa);
        despesa = despesaRepository.save(despesa);
        registrarAuditoria(despesa.getId(), logado.getId(), "CRIACAO", null, despesa.getStatus().name(), null);
        return toDTO(despesa);
    }

    @Transactional
    public DespesaDTO atualizar(Long id, DespesaDTO dto) {
        Usuario logado = usuarioLogado();
        validarEdicao(logado);
        Despesa despesa = despesaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        if (!unidadesPermitidas().contains(despesa.getUnidade().getId())) {
            throw new ResourceNotFoundException("Despesa não encontrada");
        }
        if (despesa.getStatus() == StatusDespesa.PAGA || despesa.getStatus() == StatusDespesa.CANCELADA) {
            throw new BusinessException("Despesa " + despesa.getStatus() + " não pode ser editada. Reabra antes de alterar.");
        }
        despesa.setNome(dto.getNome().trim());
        despesa.setDescricao(dto.getDescricao());
        despesa.setValor(dto.getValor());
        despesa.setDataCompetencia(dto.getDataCompetencia());
        despesa.setDataVencimento(dto.getDataVencimento());
        despesa.setFornecedor(dto.getFornecedor());
        despesa.setFormaPagamento(dto.getFormaPagamento());
        despesa.setRecorrencia(dto.getRecorrencia() != null ? dto.getRecorrencia() : despesa.getRecorrencia());
        if (Boolean.TRUE.equals(dto.getReembolsavel()) != Boolean.TRUE.equals(despesa.getReembolsavel())) {
            despesa.setReembolsavel(Boolean.TRUE.equals(dto.getReembolsavel()));
        }
        despesa.setCentroCusto(dto.getCentroCusto());
        if (dto.getCategoriaId() != null && !dto.getCategoriaId().equals(despesa.getCategoria().getId())) {
            CategoriaDespesa nova = categoriaRepository.findById(dto.getCategoriaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
            despesa.setCategoria(nova);
        }
        if (dto.getUnidadeId() != null && !dto.getUnidadeId().equals(despesa.getUnidade().getId())) {
            if (!unidadesPermitidas().contains(dto.getUnidadeId())) {
                throw new BusinessException("Sem permissão na unidade selecionada");
            }
            despesa.setUnidade(unidadeRepository.findById(dto.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada")));
        }
        despesa.setAtualizadoPorId(logado.getId());
        validarDatas(despesa);
        despesa = despesaRepository.save(despesa);
        registrarAuditoria(despesa.getId(), logado.getId(), "EDICAO", null, null, null);
        return toDTO(despesa);
    }

    @Transactional
    public DespesaDTO alterarStatus(Long id, StatusDespesa novoStatus, LocalDate dataPagamento) {
        Usuario logado = usuarioLogado();
        validarEdicao(logado);
        Despesa despesa = despesaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        if (!unidadesPermitidas().contains(despesa.getUnidade().getId())) {
            throw new ResourceNotFoundException("Despesa não encontrada");
        }
        StatusDespesa anterior = despesa.getStatus();
        if (anterior == novoStatus) return toDTO(despesa);
        validarTransicao(anterior, novoStatus);

        despesa.setStatus(novoStatus);
        switch (novoStatus) {
            case APROVADA -> despesa.setAprovadoPorId(logado.getId());
            case PAGA -> {
                despesa.setPagoPorId(logado.getId());
                despesa.setDataPagamento(dataPagamento != null ? dataPagamento : LocalDate.now());
            }
            case CANCELADA -> despesa.setPagoPorId(null);
            default -> {}
        }
        despesa.setAtualizadoPorId(logado.getId());
        despesa = despesaRepository.save(despesa);
        registrarAuditoria(despesa.getId(), logado.getId(), "ALTERACAO_STATUS",
                anterior.name(), novoStatus.name(), null);
        return toDTO(despesa);
    }

    @Transactional
    public void excluir(Long id) {
        Usuario logado = usuarioLogado();
        validarEdicao(logado);
        Despesa despesa = despesaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa não encontrada"));
        if (!unidadesPermitidas().contains(despesa.getUnidade().getId())) {
            throw new ResourceNotFoundException("Despesa não encontrada");
        }
        if (despesa.getStatus() == StatusDespesa.PAGA) {
            throw new BusinessException("Despesa paga não pode ser excluída. Cancele antes.");
        }
        registrarAuditoria(despesa.getId(), logado.getId(), "EXCLUSAO",
                despesa.getStatus().name(), null, "Despesa excluída");
        despesaRepository.delete(despesa);
    }

    // ------------ helpers ------------

    private boolean aplicarFiltroStatus(Despesa d, String filtro, LocalDate hoje) {
        if (filtro == null || filtro.isBlank() || "TODAS".equalsIgnoreCase(filtro)) return true;
        return switch (filtro.toUpperCase()) {
            case "NAO_PAGAS" -> d.getStatus() != StatusDespesa.PAGA && d.getStatus() != StatusDespesa.CANCELADA;
            case "VENCENDO" -> d.getStatus() != StatusDespesa.PAGA && d.getStatus() != StatusDespesa.CANCELADA
                    && !d.getDataVencimento().isBefore(hoje) && !d.getDataVencimento().isAfter(hoje.plusDays(7));
            case "ATRASADAS" -> d.getStatus() != StatusDespesa.PAGA && d.getStatus() != StatusDespesa.CANCELADA
                    && d.getDataVencimento().isBefore(hoje);
            case "RASCUNHO", "APROVADA", "PAGA", "CANCELADA" -> d.getStatus().name().equals(filtro.toUpperCase());
            default -> true;
        };
    }

    private boolean aplicarBusca(Despesa d, String busca) {
        if (busca == null || busca.isBlank()) return true;
        String alvo = busca.toLowerCase().trim();
        return contains(d.getNome(), alvo)
                || contains(d.getDescricao(), alvo)
                || contains(d.getFornecedor(), alvo)
                || (d.getCategoria() != null && contains(d.getCategoria().getNome(), alvo));
    }

    private boolean contains(String campo, String busca) {
        return campo != null && campo.toLowerCase().contains(busca);
    }

    private void validarDatas(Despesa d) {
        if (d.getDataVencimento().isBefore(d.getDataCompetencia().minusDays(31))) {
            throw new BusinessException("Vencimento muito anterior à competência");
        }
    }

    private void validarTransicao(StatusDespesa atual, StatusDespesa novo) {
        boolean ok = switch (atual) {
            case RASCUNHO -> novo == StatusDespesa.APROVADA || novo == StatusDespesa.PAGA
                    || novo == StatusDespesa.CANCELADA;
            case APROVADA -> novo == StatusDespesa.PAGA || novo == StatusDespesa.RASCUNHO
                    || novo == StatusDespesa.CANCELADA;
            case PAGA -> novo == StatusDespesa.APROVADA; // permite reabrir
            case CANCELADA -> novo == StatusDespesa.RASCUNHO; // permite restaurar
        };
        if (!ok) throw new BusinessException("Transição de status inválida: " + atual + " → " + novo);
    }

    private void validarEdicao(Usuario u) {
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN
                || u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                || u.getPerfil() == Usuario.PerfilUsuario.GERENTE) {
            return;
        }
        throw new BusinessException("Sem permissão para gerenciar despesas");
    }

    private void registrarAuditoria(Long despesaId, Long usuarioId, String acao,
                                    String anterior, String novo, String obs) {
        auditoriaRepository.save(DespesaAuditoria.builder()
                .despesaId(despesaId)
                .usuarioId(usuarioId)
                .acao(acao)
                .statusAnterior(anterior)
                .statusNovo(novo)
                .observacao(obs)
                .build());
    }

    private DespesaDTO toDTO(Despesa d) {
        LocalDate hoje = LocalDate.now();
        long diasAtraso = 0;
        if (d.getStatus() != StatusDespesa.PAGA && d.getStatus() != StatusDespesa.CANCELADA
                && d.getDataVencimento().isBefore(hoje)) {
            diasAtraso = hoje.toEpochDay() - d.getDataVencimento().toEpochDay();
        }
        String criadorNome = d.getCriadoPorId() != null
                ? usuarioRepository.findById(d.getCriadoPorId()).map(Usuario::getNome).orElse(null)
                : null;
        String pagadorNome = d.getPagoPorId() != null
                ? usuarioRepository.findById(d.getPagoPorId()).map(Usuario::getNome).orElse(null)
                : null;
        return DespesaDTO.builder()
                .id(d.getId())
                .nome(d.getNome())
                .descricao(d.getDescricao())
                .valor(d.getValor())
                .dataCompetencia(d.getDataCompetencia())
                .dataVencimento(d.getDataVencimento())
                .dataPagamento(d.getDataPagamento())
                .categoriaId(d.getCategoria().getId())
                .categoriaNome(d.getCategoria().getNome())
                .categoriaCor(d.getCategoria().getCor())
                .unidadeId(d.getUnidade().getId())
                .unidadeNome(d.getUnidade().getNome())
                .fornecedor(d.getFornecedor())
                .formaPagamento(d.getFormaPagamento())
                .status(d.getStatus())
                .recorrencia(d.getRecorrencia())
                .despesaOrigemId(d.getDespesaOrigemId())
                .reembolsavel(d.getReembolsavel())
                .centroCusto(d.getCentroCusto())
                .criadoPorId(d.getCriadoPorId())
                .criadoPorNome(criadorNome)
                .pagoPorId(d.getPagoPorId())
                .pagoPorNome(pagadorNome)
                .diasAtraso(diasAtraso)
                .build();
    }

    private Usuario usuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private Long adminUnicoIdDo(Usuario u) {
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) return u.getId();
        return u.getAdminUnicoId();
    }

    private Set<Long> unidadesPermitidas() {
        Usuario u = usuarioLogado();
        return switch (u.getPerfil()) {
            case ADMIN -> unidadeRepository.findAll().stream().map(Unidade::getId).collect(Collectors.toSet());
            case ADMINISTRADOR -> unidadeRepository.findByAdminUnicoId(u.getId()).stream()
                    .map(Unidade::getId).collect(Collectors.toSet());
            case GERENTE -> {
                Long adminUnicoId = u.getAdminUnicoId();
                if (adminUnicoId != null) {
                    yield unidadeRepository.findByAdminUnicoId(adminUnicoId).stream()
                            .map(Unidade::getId).collect(Collectors.toSet());
                }
                yield u.getUnidades() == null ? Set.of()
                        : u.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            }
            default -> Set.of();
        };
    }
}
