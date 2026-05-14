package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusPagamento;
import br.com.agendainteligente.domain.enums.TipoPagamento;
import br.com.agendainteligente.dto.PagamentoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PagamentoMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.PagamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final PagamentoMapper pagamentoMapper;

    @Transactional(readOnly = true)
    public PagamentoDTO buscarPorAgendamentoId(Long agendamentoId) {
        log.debug("Buscando pagamento do agendamento: {}", agendamentoId);
        Pagamento pagamento = pagamentoRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento não encontrado para o agendamento: " + agendamentoId));
        return pagamentoMapper.toDTO(pagamento);
    }

    @Transactional
    public PagamentoDTO registrarPagamento(Long agendamentoId,
                                           TipoPagamento tipoPagamento,
                                           BigDecimal valorPagamento,
                                           LocalDate dataPagamento) {
        log.debug("Registrando pagamento manual para agendamento {} (tipo: {}, valor: {})",
                agendamentoId, tipoPagamento, valorPagamento);

        Agendamento agendamento = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));

        if (agendamento.getStatus() == StatusAgendamento.CANCELADO || agendamento.getStatus() == StatusAgendamento.NO_SHOW) {
            throw new BusinessException("Não é possível registrar pagamento para agendamento cancelado ou não comparecimento");
        }

        if (valorPagamento == null || valorPagamento.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Valor do pagamento deve ser maior que zero");
        }

        BigDecimal valorPagoAtual = agendamento.getValorFinal() != null ? agendamento.getValorFinal() : BigDecimal.ZERO;
        BigDecimal novoTotalPago = valorPagoAtual.add(valorPagamento);
        BigDecimal valorTotalAgendamento = agendamento.getValorTotal() != null ? agendamento.getValorTotal() : BigDecimal.ZERO;

        if (novoTotalPago.compareTo(valorTotalAgendamento) > 0) {
            BigDecimal valorRestante = valorTotalAgendamento.subtract(valorPagoAtual);
            throw new BusinessException("Pagamento excede o valor restante do agendamento: " + valorRestante);
        }

        Optional<Pagamento> pagamentoExistente = pagamentoRepository.findByAgendamentoId(agendamentoId);
        Pagamento pagamento = pagamentoExistente.orElseGet(() -> Pagamento.builder()
                .agendamento(agendamento)
                .build());

        pagamento.setTipoPagamento(tipoPagamento);
        pagamento.setValor(novoTotalPago);
        pagamento.setStatus(StatusPagamento.APROVADO);
        pagamento.setDataPagamento(dataPagamento.atStartOfDay());

        pagamento = pagamentoRepository.save(pagamento);

        agendamento.setValorFinal(novoTotalPago);
        agendamentoRepository.save(agendamento);

        log.info("Pagamento manual registrado. Agendamento: {}, Pago total: {}", agendamentoId, novoTotalPago);
        return pagamentoMapper.toDTO(pagamento);
    }

    @Transactional
    public void ajustarPagamento(Long agendamentoId,
                                 TipoPagamento tipoPagamento,
                                 BigDecimal valorAjuste,
                                 LocalDate dataPagamento,
                                 boolean removerValor) {
        log.debug("Ajustando pagamento do agendamento {} (tipo: {}, valorAjuste: {}, remover: {})",
                agendamentoId, tipoPagamento, valorAjuste, removerValor);

        Agendamento agendamento = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));

        if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO) {
            throw new BusinessException("Ajuste de pagamento permitido apenas para agendamentos confirmados");
        }

        if (valorAjuste == null || valorAjuste.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Valor do ajuste deve ser maior ou igual a zero");
        }

        BigDecimal valorPagoAtual = agendamento.getValorFinal() != null ? agendamento.getValorFinal() : BigDecimal.ZERO;
        BigDecimal valorTotalAgendamento = agendamento.getValorTotal() != null ? agendamento.getValorTotal() : BigDecimal.ZERO;
        BigDecimal novoTotalPago = removerValor
                ? valorPagoAtual.subtract(valorAjuste)
                : valorPagoAtual.add(valorAjuste);

        if (novoTotalPago.compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessException("Não é possível remover mais do que o valor já pago");
        }

        if (novoTotalPago.compareTo(valorTotalAgendamento) > 0) {
            BigDecimal valorRestante = valorTotalAgendamento.subtract(valorPagoAtual);
            throw new BusinessException("Ajuste excede o valor restante do agendamento: " + valorRestante);
        }

        Optional<Pagamento> pagamentoExistente = pagamentoRepository.findByAgendamentoId(agendamentoId);
        if (novoTotalPago.compareTo(BigDecimal.ZERO) == 0) {
            pagamentoExistente.ifPresent(pagamento -> {
                // Evita merge em entidade já removida ao salvar o agendamento na mesma transação
                agendamento.setPagamento(null);
                pagamentoRepository.delete(pagamento);
            });
            agendamento.setValorFinal(null);
            agendamentoRepository.save(agendamento);
            log.info("Pagamento removido do agendamento {} após ajuste para zero", agendamentoId);
            return;
        }

        Pagamento pagamento = pagamentoExistente.orElseGet(() -> Pagamento.builder()
                .agendamento(agendamento)
                .build());

        pagamento.setTipoPagamento(tipoPagamento);
        pagamento.setValor(novoTotalPago);
        pagamento.setStatus(StatusPagamento.APROVADO);
        pagamento.setDataPagamento(dataPagamento.atStartOfDay());
        pagamentoRepository.save(pagamento);

        agendamento.setValorFinal(novoTotalPago);
        agendamentoRepository.save(agendamento);

        log.info("Pagamento ajustado. Agendamento: {}, Novo total pago: {}", agendamentoId, novoTotalPago);
    }

    @Transactional
    public PagamentoDTO processarPagamento(Long agendamentoId, TipoPagamento tipoPagamento) {
        log.debug("Processando pagamento para agendamento: {}, tipo: {}", agendamentoId, tipoPagamento);
        
        Agendamento agendamento = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        
        if (agendamento.getStatus() != StatusAgendamento.CONFIRMADO 
                && agendamento.getStatus() != StatusAgendamento.AGENDADO) {
            throw new BusinessException("Agendamento não está em status válido para pagamento");
        }

        BigDecimal valorPagoAtual = agendamento.getValorFinal() != null ? agendamento.getValorFinal() : BigDecimal.ZERO;
        BigDecimal valorTotalAgendamento = agendamento.getValorTotal() != null ? agendamento.getValorTotal() : BigDecimal.ZERO;
        BigDecimal valorRestante = valorTotalAgendamento.subtract(valorPagoAtual);

        if (valorRestante.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Agendamento já está totalmente pago");
        }

        Optional<Pagamento> pagamentoExistente = pagamentoRepository.findByAgendamentoId(agendamentoId);
        Pagamento pagamento = pagamentoExistente.orElseGet(() -> Pagamento.builder()
                .agendamento(agendamento)
                .build());

        pagamento.setTipoPagamento(tipoPagamento);
        pagamento.setValor(valorPagoAtual.add(valorRestante));
        pagamento.setStatus(StatusPagamento.PENDENTE);
        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento criado com sucesso. ID: {}", pagamento.getId());
        return pagamentoMapper.toDTO(pagamento);
    }

}
