package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.StatusComissao;
import br.com.agendainteligente.domain.enums.TipoComissao;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "comissao_lancamentos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoLancamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id", nullable = false)
    private Atendente atendente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_servico_id")
    private AgendamentoServico agendamentoServico;

    @Column(name = "valor_base", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorBase;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_aplicado", nullable = false, length = 20)
    private TipoComissao tipoAplicado;

    @Column(name = "valor_regra", nullable = false, precision = 12, scale = 4)
    private BigDecimal valorRegra;

    @Column(name = "valor_comissao", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorComissao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusComissao status = StatusComissao.PENDENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagamento_id")
    private ComissaoPagamento pagamento;

    @Column(name = "data_calculo", nullable = false, updatable = false)
    private LocalDateTime dataCalculo;

    @PrePersist
    void onCreate() {
        dataCalculo = LocalDateTime.now();
    }
}
