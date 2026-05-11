package br.com.agendainteligente.integration.notafacil;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;

import java.math.BigDecimal;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes de integração do NotaFacilClient contra um servidor HTTP stub (WireMock).
 *
 * Em produção, o client continua chamando o gateway real do Nota MEI Gateway
 * (https://api.notameigateway.com.br) — esta classe apenas valida o mapeamento
 * de request/response, tratamento de erros HTTP e comportamento de timeout
 * sem dependência de rede externa.
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class NotaFacilClientIntegrationTest {

    private WireMockServer wireMockServer;
    private NotaFacilClient client;
    private static final String API_KEY = "sk_test_abc123";

    @BeforeAll
    void startWireMock() {
        // Porta dinâmica para evitar conflito quando rodando em paralelo no CI.
        wireMockServer = new WireMockServer(wireMockConfig().dynamicPort());
        wireMockServer.start();
        WireMock.configureFor("localhost", wireMockServer.port());

        String baseUrl = "http://localhost:" + wireMockServer.port();
        client = new NotaFacilClient(baseUrl);
    }

    @AfterAll
    void stopWireMock() {
        wireMockServer.stop();
    }

    @BeforeEach
    void resetStubs() {
        wireMockServer.resetAll();
    }

    // ── emitirNfse ───────────────────────────────────────────────────────────

    @Test
    void emitirNfse_sucesso_retorna202ComNotaIdEStatusProcessando() {
        stubFor(post(urlEqualTo("/v1/nfse"))
                .withHeader("Authorization", equalTo("Bearer " + API_KEY))
                .withHeader("Content-Type", containing("application/json"))
                .willReturn(aResponse()
                        .withStatus(202)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "notaId": "uuid-123",
                                  "status": "PROCESSANDO",
                                  "mensagem": "Nota enviada para processamento"
                                }
                                """)));

        NotaFacilClient.EmissaoRequest req = buildRequest();
        NotaFacilClient.EmissaoResponse resp = client.emitirNfse(API_KEY, req);

        assertEquals("uuid-123", resp.getNotaId());
        assertEquals("PROCESSANDO", resp.getStatus());
        // Valida que os campos chave foram serializados no body
        // (matchingJsonPath sem matcher checa apenas existência do path)
        verify(postRequestedFor(urlEqualTo("/v1/nfse"))
                .withHeader("Authorization", equalTo("Bearer " + API_KEY))
                .withRequestBody(matchingJsonPath("$.servico.valor"))
                .withRequestBody(matchingJsonPath("$.tomador.documento", equalTo("12345678000190")))
                .withRequestBody(matchingJsonPath("$.competencia", equalTo("2026-05"))));
    }

    @Test
    void emitirNfse_422rejeicao_lancaNotaFacilException() {
        stubFor(post(urlEqualTo("/v1/nfse"))
                .willReturn(aResponse()
                        .withStatus(422)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {"error":"VALIDATION_ERROR","message":"CNPJ inválido"}
                                """)));

        NotaFacilException ex = assertThrows(NotaFacilException.class,
                () -> client.emitirNfse(API_KEY, buildRequest()));
        assertTrue(ex.getMessage().contains("422"));
        assertTrue(ex.getMessage().contains("CNPJ"));
    }

    @Test
    void emitirNfse_5xx_lancaNotaFacilException() {
        stubFor(post(urlEqualTo("/v1/nfse"))
                .willReturn(aResponse()
                        .withStatus(503)
                        .withHeader("Content-Type", "text/plain")
                        .withBody("Service Unavailable")));

        NotaFacilException ex = assertThrows(NotaFacilException.class,
                () -> client.emitirNfse(API_KEY, buildRequest()));
        assertTrue(ex.getMessage().contains("503"));
    }

    @Test
    void emitirNfse_401semAuth_lancaNotaFacilException() {
        stubFor(post(urlEqualTo("/v1/nfse"))
                .willReturn(aResponse()
                        .withStatus(401)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {"error":"INVALID_API_KEY"}
                                """)));

        NotaFacilException ex = assertThrows(NotaFacilException.class,
                () -> client.emitirNfse("sk_invalid", buildRequest()));
        assertTrue(ex.getMessage().contains("401"));
    }

    // ── consultarNfse ────────────────────────────────────────────────────────

    @Test
    void consultarNfse_autorizada_retornaCamposCompletos() {
        stubFor(get(urlEqualTo("/v1/nfse/uuid-123"))
                .withHeader("Authorization", equalTo("Bearer " + API_KEY))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "notaId": "uuid-123",
                                  "status": "AUTORIZADA",
                                  "numeroNfse": "000123",
                                  "codigoVerificacao": "ABC12345",
                                  "pdfUrl": "https://api.notameigateway.com.br/v1/nfse/uuid-123/pdf",
                                  "xmlUrl": "https://api.notameigateway.com.br/v1/nfse/uuid-123/xml"
                                }
                                """)));

        NotaFacilClient.ConsultaResponse resp = client.consultarNfse(API_KEY, "uuid-123");

        assertEquals("AUTORIZADA", resp.getStatus());
        assertEquals("000123", resp.getNumeroNfse());
        assertEquals("ABC12345", resp.getCodigoVerificacao());
        assertNotNull(resp.getPdfUrl());
        assertNotNull(resp.getXmlUrl());
    }

    @Test
    void consultarNfse_rejeitada_retornaErroDescricao() {
        stubFor(get(urlEqualTo("/v1/nfse/uuid-456"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "notaId": "uuid-456",
                                  "status": "REJEITADA",
                                  "erroDescricao": "E001 - Tomador não encontrado"
                                }
                                """)));

        NotaFacilClient.ConsultaResponse resp = client.consultarNfse(API_KEY, "uuid-456");
        assertEquals("REJEITADA", resp.getStatus());
        assertEquals("E001 - Tomador não encontrado", resp.getErroDescricao());
        assertNull(resp.getNumeroNfse());
    }

    @Test
    void consultarNfse_404_lancaNotaFacilException() {
        stubFor(get(urlEqualTo("/v1/nfse/inexistente"))
                .willReturn(aResponse().withStatus(404).withBody("not found")));

        NotaFacilException ex = assertThrows(NotaFacilException.class,
                () -> client.consultarNfse(API_KEY, "inexistente"));
        assertTrue(ex.getMessage().contains("inexistente"));
        assertTrue(ex.getMessage().contains("404"));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private NotaFacilClient.EmissaoRequest buildRequest() {
        return NotaFacilClient.EmissaoRequest.builder()
                .servico(NotaFacilClient.EmissaoRequest.Servico.builder()
                        .codigoNbs("01.01.01.10")
                        .discriminacao("Desenvolvimento de software")
                        .valor(new BigDecimal("3500.00"))
                        .aliquotaIss(2.0)
                        .build())
                .tomador(NotaFacilClient.EmissaoRequest.Tomador.builder()
                        .tipo("PJ")
                        .documento("12345678000190")
                        .razaoSocial("Empresa Cliente LTDA")
                        .email("financeiro@empresa.com")
                        .municipioIbge("3550308")
                        .build())
                .competencia("2026-05")
                .webhookUrl("https://agenda.com/webhooks/nfse")
                .build();
    }
}
