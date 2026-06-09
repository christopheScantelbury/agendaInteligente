package br.com.agendainteligente.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class AgendamentoServicoDTO {

    @NotNull(message = "Serviço é obrigatório")
    private Long servicoId;

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal valor;

    private String descricao;

    @NotNull(message = "Quantidade é obrigatória")
    @Min(value = 1, message = "Quantidade deve ser no mínimo 1")
    private Integer quantidade;

    private BigDecimal valorTotal;

    // ── Issue #155: por item (opcionais; NULL = herda do agendamento) ────────
    /** Profissional do item; opcional. Se nulo, herda do agendamento. */
    private Long atendenteId;

    /** Início do item; opcional. Se nulo, herda do agendamento. */
    private LocalDateTime dataHoraInicio;

    /** Fim do item; opcional. Se nulo, herda do agendamento (ou inicio + duracao). */
    private LocalDateTime dataHoraFim;

    // Para exibição
    private String nomeServico;
    private String nomeAtendente;
}
