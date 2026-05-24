package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DespesaResumoDTO {
    private BigDecimal totalRascunho;
    private BigDecimal totalAprovada;
    private BigDecimal totalPaga;
    private BigDecimal totalCancelada;
    private BigDecimal totalGeral;
    private long quantidadeVencidas;
}
