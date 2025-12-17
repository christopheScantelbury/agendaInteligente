package br.com.agendainteligente.integration;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.integration.NfseManausIntegration.ResultadoNfse;

import java.math.BigDecimal;

/**
 * Interface comum para integrações de NFS-e
 * Permite diferentes implementações (Municipal ABRASF, Nacional MEI, etc.)
 */
public interface NfseIntegration {
    
    /**
     * Emite nota fiscal de serviço eletrônica
     * 
     * @param agendamento Agendamento para o qual a nota será emitida
     * @param valor Valor total da nota fiscal
     * @return Resultado da emissão com número, código de verificação, URL, etc.
     */
    ResultadoNfse emitirNotaFiscal(Agendamento agendamento, BigDecimal valor);
}

