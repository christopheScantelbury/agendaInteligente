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
public class PerformanceDTO {
    private LocalDate inicio;
    private LocalDate fim;
    private long diasNoPeriodo;
    private BigDecimal receita;
    private BigDecimal despesa;
    private BigDecimal lucro;
    private long atendimentos;
    private long clientesAtendidos;
    private long horasAtendidas;
    private Long atendenteId;
    private String atendenteNome;
}
