package br.com.agendainteligente.integration.nfse.xml;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Parser para respostas XML dos web services NFS-e
 */
@Component
@Slf4j
public class NfseXmlParser {

    /**
     * Extrai o protocolo da resposta de recepção de lote
     */
    public String extrairProtocolo(String xmlResposta) {
        try {
            Document doc = parseXml(xmlResposta);
            NodeList protocoloNodes = doc.getElementsByTagName("Protocolo");
            if (protocoloNodes.getLength() > 0) {
                return protocoloNodes.item(0).getTextContent().trim();
            }
        } catch (Exception e) {
            log.error("Erro ao extrair protocolo do XML", e);
        }
        return null;
    }

    /**
     * Extrai mensagens de retorno/erro
     */
    public List<MensagemRetorno> extrairMensagensRetorno(String xmlResposta) {
        List<MensagemRetorno> mensagens = new ArrayList<>();
        try {
            Document doc = parseXml(xmlResposta);
            NodeList mensagemNodes = doc.getElementsByTagName("MensagemRetorno");
            
            for (int i = 0; i < mensagemNodes.getLength(); i++) {
                Element mensagem = (Element) mensagemNodes.item(i);
                String codigo = getTextContent(mensagem, "Codigo");
                String mensagemTexto = getTextContent(mensagem, "Mensagem");
                String correcao = getTextContent(mensagem, "Correcao");
                
                mensagens.add(new MensagemRetorno(codigo, mensagemTexto, correcao));
            }
        } catch (Exception e) {
            log.error("Erro ao extrair mensagens de retorno", e);
        }
        return mensagens;
    }

    /**
     * Extrai dados da NFSe gerada
     */
    public DadosNfse extrairDadosNfse(String xmlResposta) {
        try {
            Document doc = parseXml(xmlResposta);
            NodeList compNfseNodes = doc.getElementsByTagName("CompNfse");
            if (compNfseNodes.getLength() > 0) {
                Element compNfse = (Element) compNfseNodes.item(0);
                Element nfse = (Element) compNfse.getElementsByTagName("Nfse").item(0);
                Element infNfse = (Element) nfse.getElementsByTagName("InfNfse").item(0);
                
                String numero = getTextContent(infNfse, "Numero");
                String codigoVerificacao = getTextContent(infNfse, "CodigoVerificacao");
                String dataEmissao = getTextContent(infNfse, "DataEmissao");
                
                return new DadosNfse(numero, codigoVerificacao, dataEmissao);
            }
        } catch (Exception e) {
            log.error("Erro ao extrair dados da NFSe", e);
        }
        return null;
    }

    /**
     * Verifica se a resposta contém erros
     */
    public boolean temErros(String xmlResposta) {
        List<MensagemRetorno> mensagens = extrairMensagensRetorno(xmlResposta);
        return mensagens.stream().anyMatch(m -> !m.getCodigo().equals("CM00"));
    }

    private Document parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        DocumentBuilder builder = factory.newDocumentBuilder();
        return builder.parse(new ByteArrayInputStream(xml.getBytes("UTF-8")));
    }

    private String getTextContent(Element element, String tagName) {
        NodeList nodes = element.getElementsByTagName(tagName);
        if (nodes.getLength() > 0) {
            Node node = nodes.item(0);
            return node.getTextContent() != null ? node.getTextContent().trim() : "";
        }
        return "";
    }

    public static class MensagemRetorno {
        private String codigo;
        private String mensagem;
        private String correcao;

        public MensagemRetorno(String codigo, String mensagem, String correcao) {
            this.codigo = codigo;
            this.mensagem = mensagem;
            this.correcao = correcao;
        }

        public String getCodigo() { return codigo; }
        public String getMensagem() { return mensagem; }
        public String getCorrecao() { return correcao; }
    }

    public static class DadosNfse {
        private String numero;
        private String codigoVerificacao;
        private String dataEmissao;

        public DadosNfse(String numero, String codigoVerificacao, String dataEmissao) {
            this.numero = numero;
            this.codigoVerificacao = codigoVerificacao;
            this.dataEmissao = dataEmissao;
        }

        public String getNumero() { return numero; }
        public String getCodigoVerificacao() { return codigoVerificacao; }
        public String getDataEmissao() { return dataEmissao; }
    }
}

