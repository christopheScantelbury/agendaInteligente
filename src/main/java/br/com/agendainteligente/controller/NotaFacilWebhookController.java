package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.NotaFiscal;
import br.com.agendainteligente.domain.enums.StatusNotaFiscal;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

/**
 * Recebe callbacks do Nota MEI Gateway (NotaFácil) com o resultado da emissão de NFS-e.
 *
 * O NotaFácil chama POST /api/webhooks/notafacil após a prefeitura autorizar ou rejeitar a nota.
 * O campo nota_id enviado no payload é o mesmo retornado em EmissaoResponse.notaId,
 * que foi salvo temporariamente em NotaFiscal.numeroNfse até a autorização definitiva.
 */
@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhooks", description = "Callbacks de sistemas externos")
public class NotaFacilWebhookController {

    private final NotaFiscalRepository notaFiscalRepository;

    @PostMapping("/notafacil")
    @Operation(summary = "Callback do NotaFácil com resultado da NFS-e")
    public ResponseEntity<Void> receberWebhook(@RequestBody NotaFacilWebhookPayload payload) {
        log.info("Webhook NotaFácil recebido — nota_id: {}, evento: {}, status: {}",
                payload.getNotaId(), payload.getEvent(), payload.getStatus());

        notaFiscalRepository.findByNumeroNfse(payload.getNotaId()).ifPresentOrElse(
                notaFiscal -> atualizarNotaFiscal(notaFiscal, payload),
                () -> log.warn("Nota fiscal com nota_id '{}' não encontrada — webhook ignorado", payload.getNotaId())
        );

        return ResponseEntity.ok().build();
    }

    private void atualizarNotaFiscal(NotaFiscal notaFiscal, NotaFacilWebhookPayload payload) {
        switch (payload.getStatus()) {
            case "AUTORIZADA" -> {
                notaFiscal.setNumeroNfse(payload.getNumeroNfse());
                notaFiscal.setCodigoVerificacao(payload.getCodigoVerificacao());
                notaFiscal.setUrlNfse(payload.getPdfUrl());
                notaFiscal.setStatus(StatusNotaFiscal.EMITIDA);
                notaFiscal.setDataEmissao(payload.getEmitidaEm() != null ? payload.getEmitidaEm() : LocalDateTime.now());
                log.info("NFS-e autorizada — número: {}", payload.getNumeroNfse());
            }
            case "REJEITADA" -> {
                notaFiscal.setStatus(StatusNotaFiscal.ERRO);
                notaFiscal.setMensagemErro("Rejeitada pela prefeitura: " + payload.getErroDescricao());
                log.warn("NFS-e rejeitada — motivo: {}", payload.getErroDescricao());
            }
            default -> log.debug("Evento ignorado: {} (status: {})", payload.getEvent(), payload.getStatus());
        }
        notaFiscalRepository.save(notaFiscal);
    }

    @Data
    @NoArgsConstructor
    public static class NotaFacilWebhookPayload {
        private String event;                    // nfse.autorizada | nfse.rejeitada
        @JsonProperty("nota_id")
        private String notaId;
        private String status;                   // AUTORIZADA | REJEITADA | PROCESSANDO
        @JsonProperty("numero_nfse")
        private String numeroNfse;
        @JsonProperty("codigo_verificacao")
        private String codigoVerificacao;
        @JsonProperty("pdf_url")
        private String pdfUrl;
        @JsonProperty("xml_url")
        private String xmlUrl;
        @JsonProperty("emitida_em")
        private LocalDateTime emitidaEm;
        @JsonProperty("erro_descricao")
        private String erroDescricao;
    }
}
