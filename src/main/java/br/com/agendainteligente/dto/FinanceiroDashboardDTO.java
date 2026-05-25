package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinanceiroDashboardDTO {
    private int ano;
    private BigDecimal receitaTotal;
    private BigDecimal despesaTotal;
    private BigDecimal lucroTotal;
    private Map<String, BigDecimal> receitaPorFormaPagamento;
    private List<MesValor> receitaPorMes;
    private List<MesValor> despesaPorMes;
    private String melhorMes;
    private BigDecimal melhorMesValor;
    private String piorMes;
    private BigDecimal piorMesValor;
    private BigDecimal ganhoMedioMensal;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MesValor {
        private String mes;
        private BigDecimal valor;
    }
}
