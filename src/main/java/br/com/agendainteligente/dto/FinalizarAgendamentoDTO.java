package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.TipoPagamento;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizarAgendamentoDTO {
    
    @NotNull(message = "Valor final é obrigatório")
    @DecimalMin(value = "0.00", message = "Valor deve ser maior ou igual a zero")
    private BigDecimal valorFinal;

    private TipoPagamento tipoPagamento;
}
