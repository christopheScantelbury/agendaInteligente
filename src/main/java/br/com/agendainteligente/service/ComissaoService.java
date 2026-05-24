package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.*;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusComissao;
import br.com.agendainteligente.domain.enums.TipoComissao;
import br.com.agendainteligente.dto.ComissaoLancamentoDTO;
import br.com.agendainteligente.dto.ComissaoPagamentoDTO;
import br.com.agendainteligente.dto.ComissaoRegraDTO;
import br.com.agendainteligente.dto.ComissaoResumoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ComissaoService {

    private final ComissaoRegraRepository regraRepository;
    private final ComissaoLancamentoRepository lancamentoRepository;
    private final ComissaoPagamentoRepository pagamentoRepository;
    private final AtendenteRepository atendenteRepository;
    private final ServicoRepository servicoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoServicoRepository agendamentoServicoRepository;
    private final UsuarioRepository usuarioRepository;

    // ---------- Regras ----------

    @Transactional(readOnly = true)
    public List<ComissaoRegraDTO> listarRegras(Long atendenteId) {
        validarAcessoAtendente(atendenteId);
        return regraRepository.findByAtendenteId(atendenteId).stream()
                .map(this::toRegraDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public ComissaoRegraDTO salvarRegra(ComissaoRegraDTO dto) {
        validarGestao();
        Atendente atendente = atendenteRepository.findById(dto.getAtendenteId())
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));
        Servico servico = dto.getServicoId() != null
                ? servicoRepository.findById(dto.getServicoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado"))
                : null;

        Optional<ComissaoRegra> existente = servico != null
                ? regraRepository.findByAtendenteAndServico(atendente.getId(), servico.getId())
                : regraRepository.findRegraPadrao(atendente.getId());

        ComissaoRegra regra = existente.orElseGet(() -> ComissaoRegra.builder()
                .atendente(atendente)
                .servico(servico)
                .adminUnicoId(atendente.getUnidade().getAdminUnicoId())
                .build());
        regra.setTipo(dto.getTipo());
        regra.setValor(dto.getValor());
        return toRegraDTO(regraRepository.save(regra));
    }

    @Transactional
    public void excluirRegra(Long id) {
        validarGestao();
        ComissaoRegra regra = regraRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Regra não encontrada"));
        validarAcessoAtendente(regra.getAtendente().getId());
        regraRepository.delete(regra);
    }

    // ---------- Pendências (calcula lançamentos sob demanda) ----------

    @Transactional
    public List<ComissaoLancamentoDTO> listarPendentes(Long atendenteId) {
        validarAcessoAtendente(atendenteId);
        Atendente atendente = atendenteRepository.findById(atendenteId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));

        // 1. Calcular lançamentos para agendamentos CONCLUIDOS que ainda não têm lançamento
        List<Agendamento> concluidos = agendamentoRepository.findByAtendenteId(atendenteId).stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .collect(Collectors.toList());

        for (Agendamento ag : concluidos) {
            List<AgendamentoServico> servicos = agendamentoServicoRepository.findByAgendamentoId(ag.getId());
            for (AgendamentoServico as : servicos) {
                if (lancamentoRepository.existsByAgendamentoServicoId(as.getId())) continue;
                criarLancamento(atendente, ag, as);
            }
        }

        return lancamentoRepository.findByAtendenteIdAndStatus(atendenteId, StatusComissao.PENDENTE).stream()
                .map(this::toLancamentoDTO)
                .collect(Collectors.toList());
    }

    private void criarLancamento(Atendente atendente, Agendamento agendamento, AgendamentoServico as) {
        BigDecimal valorBase = as.getValorTotal() != null ? as.getValorTotal()
                : (as.getValor() != null ? as.getValor() : BigDecimal.ZERO);

        // Prioridade: regra serviço+profissional > regra padrão profissional > percentualComissao do atendente
        Optional<ComissaoRegra> regraEspecifica = regraRepository.findByAtendenteAndServico(
                atendente.getId(), as.getServico().getId());
        TipoComissao tipo;
        BigDecimal valorRegra;
        if (regraEspecifica.isPresent()) {
            tipo = regraEspecifica.get().getTipo();
            valorRegra = regraEspecifica.get().getValor();
        } else {
            Optional<ComissaoRegra> regraPadrao = regraRepository.findRegraPadrao(atendente.getId());
            if (regraPadrao.isPresent()) {
                tipo = regraPadrao.get().getTipo();
                valorRegra = regraPadrao.get().getValor();
            } else {
                tipo = TipoComissao.PERCENTUAL;
                valorRegra = atendente.getPercentualComissao() != null
                        ? atendente.getPercentualComissao() : BigDecimal.ZERO;
            }
        }

        BigDecimal valorComissao = tipo == TipoComissao.PERCENTUAL
                ? valorBase.multiply(valorRegra).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : valorRegra.setScale(2, RoundingMode.HALF_UP);

        if (valorComissao.compareTo(BigDecimal.ZERO) <= 0) return;

        lancamentoRepository.save(ComissaoLancamento.builder()
                .atendente(atendente)
                .agendamento(agendamento)
                .agendamentoServico(as)
                .valorBase(valorBase)
                .tipoAplicado(tipo)
                .valorRegra(valorRegra)
                .valorComissao(valorComissao)
                .status(StatusComissao.PENDENTE)
                .build());
    }

    // ---------- Resumo ----------

    @Transactional(readOnly = true)
    public ComissaoResumoDTO resumo(Long atendenteId) {
        validarAcessoAtendente(atendenteId);
        Atendente a = atendenteRepository.findById(atendenteId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));
        BigDecimal pendente = lancamentoRepository.somar(atendenteId, StatusComissao.PENDENTE);
        BigDecimal pago = lancamentoRepository.somar(atendenteId, StatusComissao.PAGA);
        long qtdPendente = lancamentoRepository.findByAtendenteIdAndStatus(atendenteId, StatusComissao.PENDENTE).size();
        long qtdPaga = lancamentoRepository.findByAtendenteIdAndStatus(atendenteId, StatusComissao.PAGA).size();
        return ComissaoResumoDTO.builder()
                .atendenteId(a.getId())
                .atendenteNome(a.getUsuario() != null ? a.getUsuario().getNome() : null)
                .pendente(pendente)
                .pago(pago)
                .quantidadePendente(qtdPendente)
                .quantidadePaga(qtdPaga)
                .build();
    }

    // ---------- Pagamento ----------

    @Transactional
    public ComissaoPagamentoDTO pagar(Long atendenteId, List<Long> lancamentoIds,
                                      String formaPagamento, String observacao) {
        validarGestao();
        validarAcessoAtendente(atendenteId);
        if (lancamentoIds == null || lancamentoIds.isEmpty()) {
            throw new BusinessException("Selecione ao menos um atendimento");
        }

        Atendente atendente = atendenteRepository.findById(atendenteId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));

        List<ComissaoLancamento> lancamentos = lancamentoRepository.findAllById(new HashSet<>(lancamentoIds));
        if (lancamentos.size() != new HashSet<>(lancamentoIds).size()) {
            throw new BusinessException("Um ou mais lançamentos não foram encontrados");
        }
        for (ComissaoLancamento l : lancamentos) {
            if (!l.getAtendente().getId().equals(atendenteId)) {
                throw new BusinessException("Lançamento de outro profissional");
            }
            if (l.getStatus() == StatusComissao.PAGA) {
                throw new BusinessException("Lançamento #" + l.getId() + " já foi pago");
            }
        }

        BigDecimal total = lancamentos.stream()
                .map(ComissaoLancamento::getValorComissao)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Usuario logado = usuarioLogado();
        ComissaoPagamento pagamento = ComissaoPagamento.builder()
                .atendente(atendente)
                .valorTotal(total)
                .dataPagamento(LocalDate.now())
                .pagoPorId(logado.getId())
                .formaPagamento(formaPagamento)
                .observacao(observacao)
                .adminUnicoId(atendente.getUnidade().getAdminUnicoId())
                .build();
        pagamento = pagamentoRepository.save(pagamento);

        for (ComissaoLancamento l : lancamentos) {
            l.setStatus(StatusComissao.PAGA);
            l.setPagamento(pagamento);
        }
        lancamentoRepository.saveAll(lancamentos);
        log.info("[COMISSAO] Pagamento #{} atendente={} valor={} lancamentos={}",
                pagamento.getId(), atendenteId, total, lancamentoIds.size());
        return toPagamentoDTO(pagamento, lancamentos);
    }

    @Transactional(readOnly = true)
    public List<ComissaoPagamentoDTO> listarPagamentos(Long atendenteId) {
        validarAcessoAtendente(atendenteId);
        return pagamentoRepository.findByAtendenteIdOrderByDataPagamentoDesc(atendenteId).stream()
                .map(p -> toPagamentoDTO(p, lancamentoRepository.findByPagamentoId(p.getId())))
                .collect(Collectors.toList());
    }

    // ---------- helpers ----------

    private ComissaoRegraDTO toRegraDTO(ComissaoRegra r) {
        return ComissaoRegraDTO.builder()
                .id(r.getId())
                .atendenteId(r.getAtendente().getId())
                .servicoId(r.getServico() != null ? r.getServico().getId() : null)
                .servicoNome(r.getServico() != null ? r.getServico().getNome() : null)
                .tipo(r.getTipo())
                .valor(r.getValor())
                .build();
    }

    private ComissaoLancamentoDTO toLancamentoDTO(ComissaoLancamento l) {
        Agendamento a = l.getAgendamento();
        return ComissaoLancamentoDTO.builder()
                .id(l.getId())
                .atendenteId(l.getAtendente().getId())
                .atendenteNome(l.getAtendente().getUsuario() != null ? l.getAtendente().getUsuario().getNome() : null)
                .agendamentoId(a.getId())
                .dataAgendamento(a.getDataHoraInicio())
                .clienteNome(a.getCliente() != null ? a.getCliente().getNome() : null)
                .agendamentoServicoId(l.getAgendamentoServico() != null ? l.getAgendamentoServico().getId() : null)
                .servicoNome(l.getAgendamentoServico() != null && l.getAgendamentoServico().getServico() != null
                        ? l.getAgendamentoServico().getServico().getNome() : null)
                .valorBase(l.getValorBase())
                .tipoAplicado(l.getTipoAplicado())
                .valorRegra(l.getValorRegra())
                .valorComissao(l.getValorComissao())
                .status(l.getStatus())
                .pagamentoId(l.getPagamento() != null ? l.getPagamento().getId() : null)
                .build();
    }

    private ComissaoPagamentoDTO toPagamentoDTO(ComissaoPagamento p, List<ComissaoLancamento> lancamentos) {
        String pagador = p.getPagoPorId() != null
                ? usuarioRepository.findById(p.getPagoPorId()).map(Usuario::getNome).orElse(null) : null;
        return ComissaoPagamentoDTO.builder()
                .id(p.getId())
                .atendenteId(p.getAtendente().getId())
                .atendenteNome(p.getAtendente().getUsuario() != null ? p.getAtendente().getUsuario().getNome() : null)
                .valorTotal(p.getValorTotal())
                .dataPagamento(p.getDataPagamento())
                .pagoPorId(p.getPagoPorId())
                .pagoPorNome(pagador)
                .formaPagamento(p.getFormaPagamento())
                .observacao(p.getObservacao())
                .dataCriacao(p.getDataCriacao())
                .lancamentosIds(lancamentos.stream().map(ComissaoLancamento::getId).collect(Collectors.toList()))
                .quantidadeAtendimentos(lancamentos.size())
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

    private void validarGestao() {
        Usuario u = usuarioLogado();
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN
                || u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                || u.getPerfil() == Usuario.PerfilUsuario.GERENTE) return;
        throw new BusinessException("Sem permissão para gerenciar comissões");
    }

    private void validarAcessoAtendente(Long atendenteId) {
        Usuario u = usuarioLogado();
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN) return;
        Atendente a = atendenteRepository.findById(atendenteId)
                .orElseThrow(() -> new ResourceNotFoundException("Profissional não encontrado"));
        Long adminAtendente = a.getUnidade() != null ? a.getUnidade().getAdminUnicoId() : null;
        Long adminUsuario = u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR ? u.getId() : u.getAdminUnicoId();
        if (adminAtendente == null || !adminAtendente.equals(adminUsuario)) {
            throw new BusinessException("Sem permissão para este profissional");
        }
    }
}
