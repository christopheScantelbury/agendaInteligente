package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluxoCaixaDiarioDTO {
    private LocalDate dia;
    private BigDecimal entradas;
    private BigDecimal saidas;
    private BigDecimal saldoDia;
    private BigDecimal saldoAcumulado;
}
