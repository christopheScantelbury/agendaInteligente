package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoPagamentoDTO {
    private Long id;
    private Long atendenteId;
    private String atendenteNome;
    private BigDecimal valorTotal;
    private LocalDate dataPagamento;
    private Long pagoPorId;
    private String pagoPorNome;
    private String formaPagamento;
    private String observacao;
    private LocalDateTime dataCriacao;
    private List<Long> lancamentosIds;
    private Integer quantidadeAtendimentos;
}
