package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.TipoComissao;
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
public class ComissaoRegraDTO {
    private Long id;

    @NotNull(message = "Atendente é obrigatório")
    private Long atendenteId;

    private Long servicoId;
    private String servicoNome;

    @NotNull(message = "Tipo é obrigatório")
    private TipoComissao tipo;

    @NotNull(message = "Valor é obrigatório")
    private BigDecimal valor;
}
