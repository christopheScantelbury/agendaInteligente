package br.com.agendainteligente.integration.notafacil;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;

/**
 * Cliente HTTP para a API REST do Nota MEI Gateway (ScantelburyDevs).
 * Documentação: https://api.notameigateway.com.br/v1
 */
@Component
@Slf4j
public class NotaFacilClient {

    private final RestClient restClient;

    public NotaFacilClient(@Value("${notafacil.api-url:https://api.notameigateway.com.br}") String apiUrl) {
        // JdkClientHttpRequestFactory usa o HttpClient do JDK 11+ que lida corretamente
        // com respostas HTTP/1.1 5xx (incluindo chunked encoding) — mais robusto que HttpURLConnection.
        // Forçamos HTTP_1_1 para evitar tentativa de upgrade h2c, incompatível com o servidor
        // real da NotaFácil e com WireMock (Jetty HTTP/1.1 only) nos testes.
        HttpClient jdkHttpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .build();
        this.restClient = RestClient.builder()
                .requestFactory(new JdkClientHttpRequestFactory(jdkHttpClient))
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Emite uma NFS-e via Nota MEI Gateway.
     *
     * @param apiKey  sk_live_... da unidade emissora
     * @param request dados da nota fiscal
     * @return resposta com nota_id e status PROCESSANDO
     */
    public EmissaoResponse emitirNfse(String apiKey, EmissaoRequest request) {
        log.info("Enviando NFS-e para NotaFácil — tomador: {}", request.getTomador().getDocumento());
        try {
            return restClient.post()
                    .uri("/v1/nfse")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        int code = resp.getStatusCode().value();
                        String body = readBodySafely(resp);
                        throw new NotaFacilException("Erro na API NotaFácil: " + code + " — " + body);
                    })
                    .body(EmissaoResponse.class);
        } catch (NotaFacilException e) {
            log.error("Erro HTTP ao emitir NFS-e: {}", e.getMessage());
            throw e;
        } catch (RestClientException e) {
            log.error("Erro de rede ao emitir NFS-e: {}", e.getMessage());
            throw new NotaFacilException("Erro de comunicação com API NotaFácil: " + e.getMessage(), e);
        }
    }

    /**
     * Consulta o status de uma nota pelo nota_id.
     */
    public ConsultaResponse consultarNfse(String apiKey, String notaId) {
        try {
            return restClient.get()
                    .uri("/v1/nfse/{id}", notaId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        int code = resp.getStatusCode().value();
                        String body = readBodySafely(resp);
                        throw new NotaFacilException(
                                "Erro ao consultar nota " + notaId + ": " + code + " — " + body);
                    })
                    .body(ConsultaResponse.class);
        } catch (NotaFacilException e) {
            log.error("Erro HTTP ao consultar NFS-e {}: {}", notaId, e.getMessage());
            throw e;
        } catch (RestClientException e) {
            log.error("Erro de rede ao consultar NFS-e {}: {}", notaId, e.getMessage());
            throw new NotaFacilException(
                    "Erro de comunicação ao consultar nota " + notaId + ": " + e.getMessage(), e);
        }
    }

    /**
     * Provisiona uma nova conta no Nota MEI Gateway via POST /v1/auth/register
     * (público, não precisa Bearer). Retorna a api_key gerada — guardar
     * imediatamente, o gateway não exibe de novo.
     *
     * Lado do parceiro (Nota MEI Gateway): valida CNPJ + check-digit + se é MEI
     * via Receita Federal (com Redis cache). Email duplicado retorna 409.
     */
    public RegisterResponse registerMei(RegisterRequest request) {
        log.info("Provisionando conta no Nota MEI Gateway — CNPJ: {}", request.getCnpj());
        try {
            return restClient.post()
                    .uri("/v1/auth/register")
                    .body(request)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        int code = resp.getStatusCode().value();
                        String body = readBodySafely(resp);
                        throw new NotaFacilException(
                                "Erro ao registrar no gateway (" + code + "): " + body);
                    })
                    .body(RegisterResponse.class);
        } catch (NotaFacilException e) {
            log.error("Falha ao registrar conta NotaFácil: {}", e.getMessage());
            throw e;
        } catch (RestClientException e) {
            log.error("Erro de rede ao registrar NotaFácil: {}", e.getMessage());
            throw new NotaFacilException("Erro de comunicação ao registrar no gateway: " + e.getMessage(), e);
        }
    }

    /** Lê o body da resposta de erro sem lançar exceção (Content-Type pode estar ausente). */
    private static String readBodySafely(org.springframework.http.client.ClientHttpResponse resp) {
        try (var is = resp.getBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
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

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RegisterRequest {
        @com.fasterxml.jackson.annotation.JsonProperty("cnpj")
        private String cnpj;

        @com.fasterxml.jackson.annotation.JsonProperty("razao_social")
        private String razaoSocial;

        @com.fasterxml.jackson.annotation.JsonProperty("email")
        private String email;

        @com.fasterxml.jackson.annotation.JsonProperty("municipio_ibge")
        private String municipioIbge;

        /** "gateway" (padrão) ou "mei" — define o produto/billing do lado do gateway. */
        @com.fasterxml.jackson.annotation.JsonProperty("produto")
        private String produto;
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RegisterResponse {
        @com.fasterxml.jackson.annotation.JsonProperty("mei_id")
        private String meiId;

        @com.fasterxml.jackson.annotation.JsonProperty("api_key")
        private String apiKey;

        @com.fasterxml.jackson.annotation.JsonProperty("plano")
        private String plano;

        @com.fasterxml.jackson.annotation.JsonProperty("message")
        private String message;
    }
}
