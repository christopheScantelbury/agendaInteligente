package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "agendamento_servicos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoServico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false)
    private Agendamento agendamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id", nullable = false)
    private Servico servico;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(length = 500)
    private String descricao;

    @Column(nullable = false)
    private Integer quantidade;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal;

    // ── Issue #155: profissional/horário próprios por item ────────────────────
    /**
     * Profissional responsável pelo item. NULL = herda agendamento.atendente.
     * Use {@link #atendenteEfetivo()} para obter o atendente resolvendo o fallback.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id")
    private Atendente atendente;

    /** Início específico do item. NULL = herda agendamento.dataHoraInicio. */
    @Column(name = "data_hora_inicio")
    private LocalDateTime dataHoraInicio;

    /** Fim específico do item. NULL = herda agendamento.dataHoraFim. */
    @Column(name = "data_hora_fim")
    private LocalDateTime dataHoraFim;

    /** Atendente efetivo: o do item se setado, senão o do agendamento. */
    @Transient
    public Atendente atendenteEfetivo() {
        return atendente != null ? atendente : (agendamento != null ? agendamento.getAtendente() : null);
    }

    @Transient
    public LocalDateTime dataHoraInicioEfetiva() {
        return dataHoraInicio != null ? dataHoraInicio : (agendamento != null ? agendamento.getDataHoraInicio() : null);
    }

    @Transient
    public LocalDateTime dataHoraFimEfetiva() {
        return dataHoraFim != null ? dataHoraFim : (agendamento != null ? agendamento.getDataHoraFim() : null);
    }
}
