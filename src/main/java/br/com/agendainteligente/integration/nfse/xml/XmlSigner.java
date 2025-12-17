package br.com.agendainteligente.integration.nfse.xml;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

/**
 * Componente para assinatura digital de XML
 * Em modo de teste, retorna o XML sem assinatura
 */
@Component
@Slf4j
public class XmlSigner {

    @Value("${nfse.manaus.certificado.usar-assinatura:false}")
    private boolean usarAssinatura;

    @Value("${nfse.manaus.certificado.caminho:}")
    private String caminhoCertificado;

    @Value("${nfse.manaus.certificado.senha:}")
    private String senhaCertificado;

    /**
     * Assina o XML conforme padrão XMLDSig
     * Em modo de teste, retorna o XML sem assinatura
     */
    public String assinarXml(String xml) {
        if (!usarAssinatura) {
            log.warn("Assinatura XML desabilitada. Retornando XML sem assinatura (modo de teste)");
            return xml;
        }

        try {
            // TODO: Implementar assinatura digital real usando Apache Santuario
            // Por enquanto, retorna sem assinatura para testes
            log.warn("Assinatura digital não implementada. Retornando XML sem assinatura");
            return xml;
        } catch (Exception e) {
            log.error("Erro ao assinar XML", e);
            throw new RuntimeException("Erro ao assinar XML: " + e.getMessage(), e);
        }
    }

    private KeyStore carregarCertificado() throws Exception {
        if (caminhoCertificado == null || caminhoCertificado.isEmpty()) {
            throw new IllegalStateException("Caminho do certificado não configurado");
        }

        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(
            new java.io.FileInputStream(caminhoCertificado),
            senhaCertificado.toCharArray()
        );
        return keyStore;
    }
}

