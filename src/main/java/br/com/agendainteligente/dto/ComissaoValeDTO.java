package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoValeDTO {
    private Long id;
    private Long atendenteId;
    private BigDecimal valor;
    private LocalDate dataVale;
    private String observacao;
    private String status;        // PENDENTE | DESCONTADO
    private Long pagamentoId;
    private LocalDateTime dataCriacao;
    private LocalDateTime dataDescontado;
}
