package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.TipoPagamento;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class AjustarPagamentoAgendamentoDTO {

    @NotNull(message = "Tipo de pagamento é obrigatório")
    private TipoPagamento tipoPagamento;

    @NotNull(message = "Valor do ajuste é obrigatório")
    @DecimalMin(value = "0.00", message = "Valor do ajuste deve ser maior ou igual a zero")
    private BigDecimal valorAjuste;

    @NotNull(message = "Data do pagamento é obrigatória")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataPagamento;
}
