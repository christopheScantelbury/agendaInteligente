package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.RecorrenciaDespesa;
import br.com.agendainteligente.domain.enums.StatusDespesa;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
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
public class DespesaDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String descricao;

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal valor;

    @NotNull(message = "Data de competência é obrigatória")
    private LocalDate dataCompetencia;

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dataVencimento;

    private LocalDate dataPagamento;

    @NotNull(message = "Categoria é obrigatória")
    private Long categoriaId;
    private String categoriaNome;
    private String categoriaCor;

    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId;
    private String unidadeNome;

    private String fornecedor;
    private String formaPagamento;
    private StatusDespesa status;
    private RecorrenciaDespesa recorrencia;
    private Long despesaOrigemId;
    // #143: parcelamento (persistido)
    private Integer numeroParcela;
    private Integer totalParcelas;
    // #143: campos transientes vindos do form de criação (service usa pra gerar filhas)
    private LocalDate dataInicioRecorrencia;
    private LocalDate dataFimRecorrencia;
    /** PRIMEIRA | NENHUMA — qual lançamento deve nascer já PAGO no modo FIXA_MENSAL */
    private String modoPagamentoRecorrencia;
    /** Quantidade de parcelas no modo PARCELADA. */
    private Integer numeroParcelas;
    private Boolean reembolsavel;
    private String centroCusto;

    private Long criadoPorId;
    private String criadoPorNome;
    private Long pagoPorId;
    private String pagoPorNome;

    /** Computado: dias de atraso (positivo se vencida e não paga). */
    private Long diasAtraso;
}
