package br.com.agendainteligente.integration.nfse.xml;

import br.com.agendainteligente.domain.entity.Agendamento;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Construtor de XML para NFS-e conforme padrão ABRASF
 * Baseado na documentação DOC_102 da Prefeitura de Manaus
 */
@Component
@Slf4j
public class NfseXmlBuilder {

    @Value("${nfse.manaus.versao-dados:V2010}")
    private String versaoDados;

    @Value("${nfse.manaus.versao-cabecalho:201001}")
    private String versaoCabecalho;

    /**
     * Monta o XML completo para envio de lote de RPS
     * Estrutura: Cabeçalho (Nfsecabecmsg) + Dados (Nfsedadosmsg)
     */
    public String montarXmlLoteRps(Agendamento agendamento, BigDecimal valor, String numeroLote) {
        var cliente = agendamento.getCliente();
        var servicosList = agendamento.getServicos();
        var clinica = agendamento.getUnidade().getClinica();

        // Monta discriminação dos serviços
        StringBuilder discriminacao = new StringBuilder();
        if (servicosList != null && !servicosList.isEmpty()) {
            for (var agendamentoServico : servicosList) {
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

        // Formata CNPJ (remove formatação)
        String cnpjPrestador = limparCnpj(clinica.getCnpj());
        String cpfCnpjTomador = limparCnpj(cliente.getCpfCnpj());
        String inscricaoMunicipal = clinica.getInscricaoMunicipal() != null && !clinica.getInscricaoMunicipal().isEmpty()
                ? clinica.getInscricaoMunicipal()
                : "00000000";

        // Data de emissão no formato ISO
        String dataEmissao = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));

        // Monta o XML do RPS
        String xmlRps = String.format("""
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
                dataEmissao,
                valor,
                escapeXml(discriminacao.toString().trim()),
                cnpjPrestador,
                inscricaoMunicipal,
                cpfCnpjTomador,
                escapeXml(cliente.getNome()),
                escapeXml(cliente.getEndereco() != null ? cliente.getEndereco() : ""),
                escapeXml(cliente.getNumero() != null ? cliente.getNumero() : ""),
                escapeXml(cliente.getComplemento() != null ? cliente.getComplemento() : ""),
                escapeXml(cliente.getBairro() != null ? cliente.getBairro() : ""),
                cliente.getCep() != null ? cliente.getCep() : "",
                cliente.getTelefone() != null ? cliente.getTelefone() : "",
                cliente.getEmail() != null ? cliente.getEmail() : ""
        );

        // Monta o Lote de RPS
        String xmlLoteRps = String.format("""
                <EnviarLoteRpsEnvio>
                    <LoteRps Id="LOTE%d">
                        <Numero>%s</Numero>
                        <Cnpj>%s</Cnpj>
                        <InscricaoMunicipal>%s</InscricaoMunicipal>
                        <QuantidadeRps>1</QuantidadeRps>
                        <ListaRps>
                            %s
                        </ListaRps>
                    </LoteRps>
                </EnviarLoteRpsEnvio>
                """,
                agendamento.getId(),
                numeroLote,
                cnpjPrestador,
                inscricaoMunicipal,
                xmlRps
        );

        // Monta o XML completo com cabeçalho e dados
        return montarXmlCompleto(xmlLoteRps);
    }

    /**
     * Monta o XML completo com cabeçalho (Nfsecabecmsg) e dados (Nfsedadosmsg)
     */
    private String montarXmlCompleto(String xmlDados) {
        return String.format("""
                <?xml version="1.0" encoding="UTF-8"?>
                <Nfsecabecmsg>
                    <cabecalho versao="%s">
                        <versaoDados>%s</versaoDados>
                    </cabecalho>
                </Nfsecabecmsg>
                <Nfsedadosmsg>
                    %s
                </Nfsedadosmsg>
                """,
                versaoCabecalho,
                versaoDados,
                xmlDados
        );
    }

    /**
     * Monta a mensagem SOAP completa para recepção de lote
     */
    public String montarMensagemSoapRecepcao(String xmlCompleto) {
        // Remove a declaração XML do início se existir
        String xmlSemDeclaracao = xmlCompleto.replaceFirst("<\\?xml[^>]*\\?>", "").trim();

        // Divide em cabeçalho e dados
        String[] partes = xmlSemDeclaracao.split("</Nfsecabecmsg>");
        String cabecalho = partes[0] + "</Nfsecabecmsg>";
        String dados = partes.length > 1 ? partes[1].trim() : "";

        return String.format("""
                <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://www.e-nfs.com.br">
                    <soapenv:Header/>
                    <soapenv:Body>
                        <e:RecepcionarLoteRps.Execute>
                            %s
                            %s
                        </e:RecepcionarLoteRps.Execute>
                    </soapenv:Body>
                </soapenv:Envelope>
                """,
                cabecalho,
                dados
        );
    }

    private String limparCnpj(String cnpj) {
        if (cnpj == null) return "";
        return cnpj.replaceAll("[^0-9]", "");
    }

    private String escapeXml(String texto) {
        if (texto == null) return "";
        return texto
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}

