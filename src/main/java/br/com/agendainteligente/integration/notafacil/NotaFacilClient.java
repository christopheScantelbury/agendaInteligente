package br.com.agendainteligente.integration.notafacil;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.time.Duration;

/**
 * Cliente HTTP para a API REST do Nota MEI Gateway (ScantelburyDevs).
 * Documentação: https://api.notameigateway.com.br/v1
 */
@Component
@Slf4j
public class NotaFacilClient {

    private final WebClient webClient;

    public NotaFacilClient(@Value("${notafacil.api-url:https://api.notameigateway.com.br}") String apiUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Emite uma NFS-e via Nota MEI Gateway.
     *
     * @param apiKey      sk_live_... da unidade emissora
     * @param request     dados da nota fiscal
     * @return resposta com nota_id e status PROCESSANDO
     */
    public EmissaoResponse emitirNfse(String apiKey, EmissaoRequest request) {
        log.info("Enviando NFS-e para NotaFácil — tomador: {}", request.getTomador().getDocumento());
        try {
            return webClient.post()
                    .uri("/v1/nfse")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(EmissaoResponse.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Erro HTTP {} ao emitir NFS-e: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new NotaFacilException("Erro na API NotaFácil: " + e.getStatusCode() + " — " + e.getResponseBodyAsString(), e);
        }
    }

    /**
     * Consulta o status de uma nota pelo nota_id.
     */
    public ConsultaResponse consultarNfse(String apiKey, String notaId) {
        try {
            return webClient.get()
                    .uri("/v1/nfse/{id}", notaId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .retrieve()
                    .bodyToMono(ConsultaResponse.class)
                    .timeout(Duration.ofSeconds(15))
                    .block();
        } catch (WebClientResponseException e) {
            log.error("Erro HTTP {} ao consultar NFS-e {}: {}", e.getStatusCode(), notaId, e.getResponseBodyAsString());
            throw new NotaFacilException("Erro ao consultar nota " + notaId + ": " + e.getStatusCode(), e);
        }
    }

    // ── DTOs internos ────────────────────────────────────────────────────────

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class EmissaoRequest {
        private Servico servico;
        private Tomador tomador;
        private String competencia;   // AAAA-MM
        private String webhookUrl;

        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class Servico {
            private String codigoNbs;
            private String discriminacao;
            private BigDecimal valor;
            private Double aliquotaIss;
        }

        @lombok.Data
        @lombok.Builder
        @lombok.NoArgsConstructor
        @lombok.AllArgsConstructor
        public static class Tomador {
            private String tipo;        // PF | PJ
            private String documento;   // CPF ou CNPJ sem pontuação
            private String razaoSocial;
            private String email;
            private String municipioIbge;
        }
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class EmissaoResponse {
        private String notaId;
        private String status;    // PROCESSANDO
        private String mensagem;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class ConsultaResponse {
        private String notaId;
        private String status;           // PROCESSANDO | AUTORIZADA | REJEITADA
        private String numeroNfse;
        private String codigoVerificacao;
        private String pdfUrl;
        private String xmlUrl;
        private String erroDescricao;
    }
}
