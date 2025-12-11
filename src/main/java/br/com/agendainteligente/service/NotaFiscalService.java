package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.NotaFiscal;
import br.com.agendainteligente.domain.enums.StatusNotaFiscal;
import br.com.agendainteligente.dto.NotaFiscalDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.integration.NfseManausIntegration;
import br.com.agendainteligente.mapper.NotaFiscalMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import java.util.concurrent.CompletableFuture;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotaFiscalService {

    private final NotaFiscalRepository notaFiscalRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final NotaFiscalMapper notaFiscalMapper;
    private final NfseManausIntegration nfseManausIntegration;

    @Transactional(readOnly = true)
    public NotaFiscalDTO buscarPorAgendamentoId(Long agendamentoId) {
        log.debug("Buscando nota fiscal do agendamento: {}", agendamentoId);
        NotaFiscal notaFiscal = notaFiscalRepository.findByAgendamentoId(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota fiscal não encontrada para o agendamento: " + agendamentoId));
        return notaFiscalMapper.toDTO(notaFiscal);
    }

    @Async("nfseExecutor")
    @Transactional
    public CompletableFuture<Void> emitirNotaFiscal(Long agendamentoId) {
        log.info("Iniciando emissão de nota fiscal para agendamento: {}", agendamentoId);
        
        Agendamento agendamento = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new ResourceNotFoundException("Agendamento não encontrado"));
        
        // Força carregamento dos serviços
        if (agendamento.getServicos() != null) {
            agendamento.getServicos().size();
        }
        
        // Verifica se já existe nota fiscal
        if (notaFiscalRepository.findByAgendamentoId(agendamentoId).isPresent()) {
            log.warn("Nota fiscal já existe para o agendamento: {}", agendamentoId);
            return CompletableFuture.completedFuture(null);
        }
        
        NotaFiscal notaFiscal = NotaFiscal.builder()
                .agendamento(agendamento)
                .status(StatusNotaFiscal.PENDENTE)
                .build();
        
        notaFiscal = notaFiscalRepository.save(notaFiscal);
        
        try {
            notaFiscal.setStatus(StatusNotaFiscal.PROCESSANDO);
            notaFiscalRepository.save(notaFiscal);
            
            // Usa valorFinal se disponível, senão usa valorTotal
            BigDecimal valorParaNfse = agendamento.getValorFinal() != null 
                    ? agendamento.getValorFinal() 
                    : agendamento.getValorTotal();
            
            // Integração com NFS-e Manaus
            var resultadoNfse = nfseManausIntegration.emitirNotaFiscal(agendamento, valorParaNfse);
            
            notaFiscal.setNumeroNfse(resultadoNfse.getNumeroNfse());
            notaFiscal.setCodigoVerificacao(resultadoNfse.getCodigoVerificacao());
            notaFiscal.setUrlNfse(resultadoNfse.getUrlNfse());
            notaFiscal.setXmlNfse(resultadoNfse.getXmlNfse());
            notaFiscal.setStatus(StatusNotaFiscal.EMITIDA);
            notaFiscal.setDataEmissao(LocalDateTime.now());
            
            log.info("Nota fiscal emitida com sucesso. Número: {}", resultadoNfse.getNumeroNfse());
            
        } catch (Exception e) {
            log.error("Erro ao emitir nota fiscal", e);
            notaFiscal.setStatus(StatusNotaFiscal.ERRO);
            notaFiscal.setMensagemErro(e.getMessage());
        }
        
        notaFiscalRepository.save(notaFiscal);
        return CompletableFuture.completedFuture(null);
    }
}

