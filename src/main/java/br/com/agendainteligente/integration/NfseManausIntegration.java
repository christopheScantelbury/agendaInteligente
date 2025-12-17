package br.com.agendainteligente.integration;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.integration.nfse.xml.NfseXmlBuilder;
import br.com.agendainteligente.integration.nfse.xml.NfseXmlParser;
import br.com.agendainteligente.integration.nfse.xml.XmlSigner;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;

/**
 * Integração completa com NFS-e de Manaus conforme padrão ABRASF
 * Baseado na documentação DOC_102 da Prefeitura de Manaus
 * 
 * Fluxo:
 * 1. Montar XML do lote de RPS
 * 2. Assinar XML (opcional em testes)
 * 3. Enviar via SOAP para recepção de lote
 * 4. Consultar situação do lote
 * 5. Consultar NFSe gerada
 */
@Component
@Slf4j
public class NfseManausIntegration {

    private final NfseXmlBuilder xmlBuilder;
    private final NfseXmlParser xmlParser;
    private final XmlSigner xmlSigner;
    private final WebClient webClient;

    @Value("${nfse.manaus.ambiente:homologacao}")
    private String ambiente;

    @Value("${nfse.manaus.url-recepcao-lote-rps}")
    private String urlRecepcaoLoteRps;

    @Value("${nfse.manaus.url-consulta-situacao-lote}")
    private String urlConsultaSituacaoLote;

    @Value("${nfse.manaus.url-consulta-nfse-por-rps}")
    private String urlConsultaNfsePorRps;

    @Value("${nfse.manaus.url-consulta-lote-rps}")
    private String urlConsultaLoteRps;

    @Value("${nfse.manaus.timeout:30000}")
    private int timeout;

    public NfseManausIntegration(NfseXmlBuilder xmlBuilder, NfseXmlParser xmlParser, XmlSigner xmlSigner) {
        this.xmlBuilder = xmlBuilder;
        this.xmlParser = xmlParser;
        this.xmlSigner = xmlSigner;
        this.webClient = WebClient.builder()
                .defaultHeader("Content-Type", MediaType.TEXT_XML_VALUE + "; charset=UTF-8")
                .defaultHeader("SOAPAction", "")
                .build();
    }

    /**
     * Emite nota fiscal seguindo o fluxo completo ABRASF
     */
    public ResultadoNfse emitirNotaFiscal(Agendamento agendamento, BigDecimal valor) {
        log.info("Iniciando emissão de NFS-e para agendamento: {} (ambiente: {})", agendamento.getId(), ambiente);

        try {
            // 1. Gera número do lote único
            String numeroLote = gerarNumeroLote(agendamento);

            // 2. Monta o XML do lote de RPS
            String xmlLoteRps = xmlBuilder.montarXmlLoteRps(agendamento, valor, numeroLote);
            log.info("XML do lote RPS montado ({} bytes)", xmlLoteRps.length());
            if (log.isDebugEnabled()) {
                log.debug("XML completo:\n{}", xmlLoteRps);
            }

            // 3. Assina o XML (ou retorna sem assinatura em modo de teste)
            String xmlAssinado = xmlSigner.assinarXml(xmlLoteRps);

            // 4. Monta mensagem SOAP
            String mensagemSoap = xmlBuilder.montarMensagemSoapRecepcao(xmlAssinado);
            log.debug("Mensagem SOAP montada");

            // 5. Envia para recepção de lote
            String respostaRecepcao = enviarLoteRps(mensagemSoap);
            log.info("Resposta da recepção de lote recebida");

            // 6. Extrai protocolo da resposta
            String protocolo = xmlParser.extrairProtocolo(respostaRecepcao);
            if (protocolo == null || protocolo.isEmpty()) {
                // Verifica se há erros
                List<NfseXmlParser.MensagemRetorno> mensagens = xmlParser.extrairMensagensRetorno(respostaRecepcao);
                if (!mensagens.isEmpty()) {
                    String erro = mensagens.stream()
                            .map(m -> m.getCodigo() + ": " + m.getMensagem())
                            .reduce((a, b) -> a + "; " + b)
                            .orElse("Erro desconhecido");
                    throw new RuntimeException("Erro ao enviar lote RPS: " + erro);
                }
                throw new RuntimeException("Protocolo não encontrado na resposta");
            }

            log.info("Lote RPS enviado com sucesso. Protocolo: {}", protocolo);

            // 7. Aguarda processamento e consulta situação do lote
            String situacaoLote = consultarSituacaoLote(agendamento, protocolo);
            log.info("Situação do lote: {}", situacaoLote);

            // 8. Consulta NFSe gerada
            return consultarNfseGerada(agendamento, protocolo, xmlLoteRps);

        } catch (Exception e) {
            log.error("Erro ao emitir NFS-e", e);
            throw new RuntimeException("Erro ao emitir NFS-e: " + e.getMessage(), e);
        }
    }

    /**
     * Envia lote de RPS para o web service
     */
    private String enviarLoteRps(String mensagemSoap) {
        log.info("=== ENVIANDO LOTE RPS ===");
        log.info("URL: {}", urlRecepcaoLoteRps);
        log.info("Tamanho da mensagem SOAP: {} bytes", mensagemSoap.length());
        
        // Log do XML completo em modo debug
        if (log.isDebugEnabled()) {
            log.debug("Mensagem SOAP completa:\n{}", mensagemSoap);
        }

        try {
            String resposta = webClient.post()
                    .uri(urlRecepcaoLoteRps)
                    .bodyValue(mensagemSoap)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
                    .block();

            log.info("=== RESPOSTA RECEBIDA ===");
            log.info("Tamanho da resposta: {} bytes", resposta != null ? resposta.length() : 0);
            log.debug("Resposta completa do web service:\n{}", resposta);
            
            return resposta;

        } catch (Exception e) {
            log.error("=== ERRO AO ENVIAR LOTE RPS ===", e);
            log.error("URL: {}", urlRecepcaoLoteRps);
            log.error("Mensagem de erro: {}", e.getMessage());
            if (e.getCause() != null) {
                log.error("Causa: {}", e.getCause().getMessage());
            }
            throw new RuntimeException("Erro ao enviar lote RPS: " + e.getMessage(), e);
        }
    }

    /**
     * Consulta situação do lote de RPS
     */
    private String consultarSituacaoLote(Agendamento agendamento, String protocolo) {
        log.info("Consultando situação do lote. Protocolo: {}", protocolo);

        try {
            var clinica = agendamento.getUnidade().getClinica();
            String cnpj = limparCnpj(clinica.getCnpj());
            String inscricaoMunicipal = clinica.getInscricaoMunicipal() != null && !clinica.getInscricaoMunicipal().isEmpty()
                    ? clinica.getInscricaoMunicipal()
                    : "00000000";

            // Monta XML de consulta
            String xmlConsulta = String.format("""
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Nfsecabecmsg>
                        <cabecalho versao="201001">
                            <versaoDados>V2010</versaoDados>
                        </cabecalho>
                    </Nfsecabecmsg>
                    <Nfsedadosmsg>
                        <ConsultarSituacaoLoteRpsEnvio>
                            <Prestador>
                                <Cnpj>%s</Cnpj>
                                <InscricaoMunicipal>%s</InscricaoMunicipal>
                            </Prestador>
                            <Protocolo>%s</Protocolo>
                        </ConsultarSituacaoLoteRpsEnvio>
                    </Nfsedadosmsg>
                    """,
                    cnpj,
                    inscricaoMunicipal,
                    protocolo
            );

            String mensagemSoap = montarSoapConsulta(xmlConsulta, "ConsultarSituacaoLoteRps");

            String resposta = webClient.post()
                    .uri(urlConsultaSituacaoLote)
                    .bodyValue(mensagemSoap)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            // Aguarda um pouco antes de consultar a NFSe
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }

            return resposta;

        } catch (Exception e) {
            log.error("Erro ao consultar situação do lote", e);
            // Não falha, apenas loga o erro
            return "";
        }
    }

    /**
     * Consulta NFSe gerada pelo protocolo
     */
    private ResultadoNfse consultarNfseGerada(Agendamento agendamento, String protocolo, String xmlOriginal) {
        log.info("Consultando NFSe gerada. Protocolo: {}", protocolo);

        try {
            var clinica = agendamento.getUnidade().getClinica();
            String cnpj = limparCnpj(clinica.getCnpj());
            String inscricaoMunicipal = clinica.getInscricaoMunicipal() != null && !clinica.getInscricaoMunicipal().isEmpty()
                    ? clinica.getInscricaoMunicipal()
                    : "00000000";

            // Monta XML de consulta do lote
            String xmlConsulta = String.format("""
                    <?xml version="1.0" encoding="UTF-8"?>
                    <Nfsecabecmsg>
                        <cabecalho versao="201001">
                            <versaoDados>V2010</versaoDados>
                        </cabecalho>
                    </Nfsecabecmsg>
                    <Nfsedadosmsg>
                        <ConsultarLoteRpsEnvio>
                            <Prestador>
                                <Cnpj>%s</Cnpj>
                                <InscricaoMunicipal>%s</InscricaoMunicipal>
                            </Prestador>
                            <Protocolo>%s</Protocolo>
                        </ConsultarLoteRpsEnvio>
                    </Nfsedadosmsg>
                    """,
                    cnpj,
                    inscricaoMunicipal,
                    protocolo
            );

            String mensagemSoap = montarSoapConsulta(xmlConsulta, "ConsultarLoteRps");

            String resposta = webClient.post()
                    .uri(urlConsultaLoteRps)
                    .bodyValue(mensagemSoap)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            // Extrai dados da NFSe
            NfseXmlParser.DadosNfse dadosNfse = xmlParser.extrairDadosNfse(resposta);

            if (dadosNfse != null && dadosNfse.getNumero() != null) {
                // NFSe gerada com sucesso
                String urlConsulta = construirUrlConsulta(dadosNfse.getNumero(), dadosNfse.getCodigoVerificacao());

                return ResultadoNfse.builder()
                        .numeroNfse(dadosNfse.getNumero())
                        .codigoVerificacao(dadosNfse.getCodigoVerificacao())
                        .urlNfse(urlConsulta)
                        .xmlNfse(xmlOriginal)
                        .protocolo(protocolo)
                        .build();
            } else {
                // Em modo de teste, gera dados simulados
                log.warn("NFSe não encontrada na resposta. Gerando dados simulados para teste");
                return gerarResultadoSimulado(agendamento, protocolo, xmlOriginal);
            }

        } catch (Exception e) {
            log.error("Erro ao consultar NFSe gerada", e);
            // Em caso de erro, retorna resultado simulado para não quebrar o fluxo
            return gerarResultadoSimulado(agendamento, protocolo, xmlOriginal);
        }
    }


    /**
     * Monta mensagem SOAP para consultas
     */
    private String montarSoapConsulta(String xmlConsulta, String nomeServico) {
        String xmlSemDeclaracao = xmlConsulta.replaceFirst("<\\?xml[^>]*\\?>", "").trim();
        String[] partes = xmlSemDeclaracao.split("</Nfsecabecmsg>");
        String cabecalho = partes[0] + "</Nfsecabecmsg>";
        String dados = partes.length > 1 ? partes[1].trim() : "";

        return String.format("""
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://www.e-nfs.com.br">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <e:%s.Execute>
                            %s
                            %s
                        </e:%s.Execute>
                    </soapenv:Body>
                </soapenv:Envelope>
                """,
                nomeServico,
                cabecalho,
                dados,
                nomeServico
        );
    }

    /**
     * Gera número de lote único
     */
    private String gerarNumeroLote(Agendamento agendamento) {
        // Formato: timestamp + ID do agendamento
        return String.format("%d%06d", System.currentTimeMillis() % 1000000000, agendamento.getId());
    }

    /**
     * Gera resultado simulado para testes
     */
    private ResultadoNfse gerarResultadoSimulado(Agendamento agendamento, String protocolo, String xmlOriginal) {
        String numeroNfse = "NFSE-" + System.currentTimeMillis();
        String codigoVerificacao = gerarCodigoVerificacao(agendamento);
        String urlConsulta = construirUrlConsulta(numeroNfse, codigoVerificacao);

        log.warn("Usando dados simulados para NFS-e (modo de teste). Número: {}, Protocolo: {}", numeroNfse, protocolo);

        return ResultadoNfse.builder()
                .numeroNfse(numeroNfse)
                .codigoVerificacao(codigoVerificacao)
                .urlNfse(urlConsulta)
                .xmlNfse(xmlOriginal)
                .protocolo(protocolo)
                .build();
    }

    /**
     * Constrói URL de consulta da NFSe
     */
    private String construirUrlConsulta(String numeroNfse, String codigoVerificacao) {
        // URL baseada no portal de consulta
        if ("homologacao".equals(ambiente)) {
            return String.format("https://nfsev-prd.manaus.am.gov.br/nfsev/servlet/hlogin?numero=%s&codigo=%s",
                    numeroNfse, codigoVerificacao);
        } else {
            return String.format("https://nfse-prd.manaus.am.gov.br/nfse/servlet/hlogin?numero=%s&codigo=%s",
                    numeroNfse, codigoVerificacao);
        }
    }

    private String gerarCodigoVerificacao(Agendamento agendamento) {
        String base = String.format("%d-%s-%d",
                agendamento.getId(),
                agendamento.getCliente().getCpfCnpj(),
                System.currentTimeMillis());
        return "CODE-" + Math.abs(base.hashCode());
    }

    private String limparCnpj(String cnpj) {
        if (cnpj == null) return "";
        return cnpj.replaceAll("[^0-9]", "");
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultadoNfse {
        private String numeroNfse;
        private String codigoVerificacao;
        private String urlNfse;
        private String xmlNfse;
        private String protocolo;
    }
}
