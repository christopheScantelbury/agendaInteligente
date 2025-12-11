package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusPagamento;
import br.com.agendainteligente.domain.enums.TipoPagamento;
import br.com.agendainteligente.dto.PagamentoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.integration.PaymentGatewayIntegration;
import br.com.agendainteligente.mapper.PagamentoMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.PagamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final PagamentoMapper pagamentoMapper;
    private final PaymentGatewayIntegration paymentGatewayIntegration;
    private final NotaFiscalService notaFiscalService;

    @Transactional(readOnly = true)
    public PagamentoDTO buscarPorAgendamentoId(Long agendamentoId) {
        log.debug("Buscando pagamento do agendamento: {}", agendamentoId);
        Pagamento pagamento = pagamentoRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento não encontrado para o agendamento: " + agendamentoId));
        return pagamentoMapper.toDTO(pagamento);
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
        
        // Verifica se já existe pagamento
        if (pagamentoRepository.findByAgendamentoId(agendamentoId).isPresent()) {
            throw new BusinessException("Já existe um pagamento para este agendamento");
        }
        
        Pagamento pagamento = Pagamento.builder()
                .agendamento(agendamento)
                .tipoPagamento(tipoPagamento)
                .valor(agendamento.getValorTotal())
                .status(StatusPagamento.PENDENTE)
                .build();
        
        // Integração com gateway de pagamento
        try {
            var resultadoPagamento = paymentGatewayIntegration.criarPagamento(
                    agendamento.getValorTotal(),
                    tipoPagamento,
                    agendamento.getId().toString()
            );
            
            pagamento.setIdTransacaoGateway(resultadoPagamento.getIdTransacao());
            pagamento.setUrlPagamento(resultadoPagamento.getUrlPagamento());
            pagamento.setStatus(StatusPagamento.PROCESSANDO);
            
        } catch (Exception e) {
            log.error("Erro ao processar pagamento no gateway", e);
            pagamento.setStatus(StatusPagamento.RECUSADO);
            throw new BusinessException("Erro ao processar pagamento: " + e.getMessage());
        }
        
        pagamento = pagamentoRepository.save(pagamento);
        log.info("Pagamento criado com sucesso. ID: {}", pagamento.getId());
        return pagamentoMapper.toDTO(pagamento);
    }

    @Transactional
    public void confirmarPagamento(String idTransacaoGateway) {
        log.debug("Confirmando pagamento com transação: {}", idTransacaoGateway);
        
        Pagamento pagamento = pagamentoRepository.findByIdTransacaoGateway(idTransacaoGateway)
                .orElseThrow(() -> new ResourceNotFoundException("Pagamento não encontrado"));
        
        if (pagamento.getStatus() == StatusPagamento.APROVADO) {
            log.warn("Pagamento já está aprovado. ID: {}", pagamento.getId());
            return;
        }
        
        pagamento.setStatus(StatusPagamento.APROVADO);
        pagamento.setDataPagamento(LocalDateTime.now());
        pagamentoRepository.save(pagamento);
        
        // Atualiza status do agendamento
        Agendamento agendamento = pagamento.getAgendamento();
        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamentoRepository.save(agendamento);
        
        log.info("Pagamento confirmado com sucesso. ID: {}", pagamento.getId());
        
        // Dispara emissão de nota fiscal de forma assíncrona
        notaFiscalService.emitirNotaFiscal(agendamento.getId());
    }
}

