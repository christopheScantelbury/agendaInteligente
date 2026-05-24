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
public class ComissaoResumoDTO {
    private Long atendenteId;
    private String atendenteNome;
    private BigDecimal pendente;
    private BigDecimal pago;
    private long quantidadePendente;
    private long quantidadePaga;
}
