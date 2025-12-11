package br.com.agendainteligente.integration;

import br.com.agendainteligente.domain.entity.Agendamento;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.time.Duration;

@Component
@Slf4j
public class NfseManausIntegration {

    @Value("${nfse.manaus.url}")
    private String nfseUrl;

    @Value("${nfse.manaus.timeout:30000}")
    private int timeout;

    private final WebClient webClient;

    public NfseManausIntegration() {
        this.webClient = WebClient.builder()
                .defaultHeader("Content-Type", MediaType.APPLICATION_XML_VALUE)
                .build();
    }

    public ResultadoNfse emitirNotaFiscal(Agendamento agendamento, BigDecimal valor) {
        log.info("Emitindo NFS-e para agendamento: {}", agendamento.getId());
        
        try {
            // Monta o XML conforme especificação da NFS-e de Manaus
            String xmlRequest = montarXmlNfse(agendamento, valor);
            
            log.debug("XML da requisição NFS-e: {}", xmlRequest);
            
            // TODO: Implementar chamada real à API da NFS-e de Manaus
            // A documentação está em: https://nfse-prd.manaus.am.gov.br/nfse/temp/DOC_102.%20DO
            // Por enquanto, simula a emissão
            
            // Exemplo de chamada (ajustar conforme documentação oficial):
            /*
            String response = webClient.post()
                    .uri(nfseUrl + "/GerarNfse")
                    .bodyValue(xmlRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
                    .block();
            */
            
            // Simulação para desenvolvimento
            return ResultadoNfse.builder()
                    .numeroNfse("NFSE-" + System.currentTimeMillis())
                    .codigoVerificacao("CODE-" + agendamento.getId())
                    .urlNfse(nfseUrl + "/consultar/" + agendamento.getId())
                    .xmlNfse(xmlRequest)
                    .build();
                    
        } catch (Exception e) {
            log.error("Erro ao emitir NFS-e", e);
            throw new RuntimeException("Erro ao emitir NFS-e: " + e.getMessage(), e);
        }
    }

    private String montarXmlNfse(Agendamento agendamento, BigDecimal valor) {
        // Monta o XML conforme especificação da NFS-e de Manaus
        // Baseado na documentação: https://nfse-prd.manaus.am.gov.br/nfse/temp/DOC_102.%20DO
        
        var cliente = agendamento.getCliente();
        var servicos = agendamento.getServicos();
        var clinica = agendamento.getUnidade().getClinica();
        
        // Monta discriminação dos serviços
        StringBuilder discriminacao = new StringBuilder();
        if (servicos != null && !servicos.isEmpty()) {
            for (var agendamentoServico : servicos) {
                var servico = agendamentoServico.getServico();
                String descricao = agendamentoServico.getDescricao() != null && !agendamentoServico.getDescricao().isEmpty()
                        ? agendamentoServico.getDescricao()
                        : servico.getDescricao() != null ? servico.getDescricao() : servico.getNome();
                
                discriminacao.append(String.format("%s - Qtd: %d - Valor Unit: R$ %.2f - Total: R$ %.2f; ",
                        descricao,
                        agendamentoServico.getQuantidade(),
                        agendamentoServico.getValor(),
                        agendamentoServico.getValorTotal()));
            }
        } else {
            discriminacao.append("Serviços prestados");
        }
        
        // Estrutura do XML conforme especificação NFS-e Manaus
        // Código do município de Manaus: 1302603
        // Item da Lista de Serviços: 14.01 (Serviços médicos)
        return String.format("""
                <?xml version="1.0" encoding="UTF-8"?>
                <Rps>
                    <IdentificacaoRps>
                        <Numero>%d</Numero>
                        <Serie>1</Serie>
                        <Tipo>1</Tipo>
                    </IdentificacaoRps>
                    <DataEmissao>%s</DataEmissao>
                    <NaturezaOperacao>1</NaturezaOperacao>
                    <OptanteSimplesNacional>2</OptanteSimplesNacional>
                    <IncentivadorCultural>2</IncentivadorCultural>
                    <Status>1</Status>
                    <Servico>
                        <Valores>
                            <ValorServicos>%.2f</ValorServicos>
                            <ValorDeducoes>0.00</ValorDeducoes>
                            <ValorPis>0.00</ValorPis>
                            <ValorCofins>0.00</ValorCofins>
                            <ValorInss>0.00</ValorInss>
                            <ValorIr>0.00</ValorIr>
                            <ValorCsll>0.00</ValorCsll>
                            <OutrasRetencoes>0.00</OutrasRetencoes>
                            <ValorIss>0.00</ValorIss>
                            <Aliquota>0.00</Aliquota>
                            <DescontoIncondicionado>0.00</DescontoIncondicionado>
                            <DescontoCondicionado>0.00</DescontoCondicionado>
                        </Valores>
                        <ItemListaServico>1401</ItemListaServico>
                        <CodigoTributacaoMunicipio>140101</CodigoTributacaoMunicipio>
                        <Discriminacao>%s</Discriminacao>
                        <CodigoMunicipio>1302603</CodigoMunicipio>
                        <ExigibilidadeISS>1</ExigibilidadeISS>
                        <MunicipioIncidencia>1302603</MunicipioIncidencia>
                    </Servico>
                    <Prestador>
                        <CpfCnpj>%s</CpfCnpj>
                        <InscricaoMunicipal>%s</InscricaoMunicipal>
                    </Prestador>
                    <Tomador>
                        <IdentificacaoTomador>
                            <CpfCnpj>%s</CpfCnpj>
                        </IdentificacaoTomador>
                        <RazaoSocial>%s</RazaoSocial>
                        <Endereco>
                            <Endereco>%s</Endereco>
                            <Numero>%s</Numero>
                            <Complemento>%s</Complemento>
                            <Bairro>%s</Bairro>
                            <CodigoMunicipio>1302603</CodigoMunicipio>
                            <Uf>AM</Uf>
                            <Cep>%s</Cep>
                        </Endereco>
                        <Contato>
                            <Telefone>%s</Telefone>
                            <Email>%s</Email>
                        </Contato>
                    </Tomador>
                </Rps>
                """,
                agendamento.getId(),
                java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                valor,
                discriminacao.toString().trim(),
                clinica.getCnpj(),
                clinica.getCnpj().substring(0, 8), // Inscrição Municipal (usar valor real)
                cliente.getCpfCnpj(),
                cliente.getNome(),
                cliente.getEndereco() != null ? cliente.getEndereco() : "",
                cliente.getNumero() != null ? cliente.getNumero() : "",
                cliente.getComplemento() != null ? cliente.getComplemento() : "",
                cliente.getBairro() != null ? cliente.getBairro() : "",
                cliente.getCep() != null ? cliente.getCep() : "",
                cliente.getTelefone() != null ? cliente.getTelefone() : "",
                cliente.getEmail() != null ? cliente.getEmail() : ""
        );
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
    }
}

