package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.NotaFiscal;
import br.com.agendainteligente.domain.enums.StatusNotaFiscal;
import br.com.agendainteligente.dto.NotaFiscalDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.integration.NfseIntegration;
import br.com.agendainteligente.integration.NfseManausIntegration;
import br.com.agendainteligente.integration.notafacil.NfseNotaFacilIntegration;
import br.com.agendainteligente.mapper.NotaFiscalMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class NotaFiscalService {

    private final NotaFiscalRepository notaFiscalRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final NotaFiscalMapper notaFiscalMapper;
    private final NfseIntegration nfseIntegration;

    public NotaFiscalService(
            NotaFiscalRepository notaFiscalRepository,
            AgendamentoRepository agendamentoRepository,
            NotaFiscalMapper notaFiscalMapper,
            NfseNotaFacilIntegration nfseNotaFacilIntegration,
            NfseManausIntegration nfseManausIntegration,
            @Value("${nfse.provider:notafacil}") String nfseProvider) {
        this.notaFiscalRepository = notaFiscalRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.notaFiscalMapper = notaFiscalMapper;
        this.nfseIntegration = "notafacil".equalsIgnoreCase(nfseProvider)
                ? nfseNotaFacilIntegration
                : nfseManausIntegration;
        log.info("NFS-e provider selecionado: {}", nfseProvider);
    }

    @Transactional(readOnly = true)
    public NotaFiscalDTO buscarPorAgendamentoId(Long agendamentoId) {
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

        if (agendamento.getServicos() != null) {
            agendamento.getServicos().size();
        }

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

            BigDecimal valorParaNfse = agendamento.getValorFinal() != null
                    ? agendamento.getValorFinal()
                    : agendamento.getValorTotal();

            var resultado = nfseIntegration.emitirNotaFiscal(agendamento, valorParaNfse);

            notaFiscal.setNumeroNfse(resultado.getNumeroNfse());
            notaFiscal.setCodigoVerificacao(resultado.getCodigoVerificacao());
            notaFiscal.setUrlNfse(resultado.getUrlNfse());
            notaFiscal.setXmlNfse(resultado.getXmlNfse());

            // Com NotaFácil, a nota fica PROCESSANDO até o webhook confirmar
            boolean processandoViaWebhook = resultado.getCodigoVerificacao() == null;
            notaFiscal.setStatus(processandoViaWebhook ? StatusNotaFiscal.PROCESSANDO : StatusNotaFiscal.EMITIDA);
            if (!processandoViaWebhook) {
                notaFiscal.setDataEmissao(LocalDateTime.now());
            }

            log.info("NFS-e enviada — número/id: {}, aguardando webhook: {}", resultado.getNumeroNfse(), processandoViaWebhook);

        } catch (Exception e) {
            log.error("Erro ao emitir nota fiscal para agendamento {}", agendamentoId, e);
            notaFiscal.setStatus(StatusNotaFiscal.ERRO);
            notaFiscal.setMensagemErro(e.getMessage());
        }

        notaFiscalRepository.save(notaFiscal);
        return CompletableFuture.completedFuture(null);
    }
}
