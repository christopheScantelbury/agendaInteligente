package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.StatusComissao;
import br.com.agendainteligente.domain.enums.TipoComissao;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoLancamentoDTO {
    private Long id;
    private Long atendenteId;
    private String atendenteNome;
    private Long agendamentoId;
    private LocalDateTime dataAgendamento;
    private String clienteNome;
    private Long agendamentoServicoId;
    private String servicoNome;
    private BigDecimal valorBase;
    private TipoComissao tipoAplicado;
    private BigDecimal valorRegra;
    private BigDecimal valorComissao;
    private StatusComissao status;
    private Long pagamentoId;
}
