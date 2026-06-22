package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.StatusAgendamento;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "agendamentos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Agendamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id", nullable = false)
    private Unidade unidade;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id", nullable = false)
    private Atendente atendente;

    @OneToMany(mappedBy = "agendamento", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<AgendamentoServico> servicos;

    @Column(nullable = false)
    private LocalDateTime dataHoraInicio;

    @Column(nullable = false)
    private LocalDateTime dataHoraFim;

    @Column(length = 500)
    private String observacoes;

    /**
     * Forma de pagamento preferida indicada pelo CLIENTE no momento do agendamento.
     * Diferente de Pagamento.tipoPagamento (efetivado pelo profissional ao finalizar).
     * Valores: PIX, CARTAO, NO_LOCAL, DINHEIRO, BOLETO.
     */
    @Column(name = "forma_pagamento_preferida", length = 20)
    private String formaPagamentoPreferida;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal; // Soma dos serviços

    @Column(precision = 10, scale = 2)
    private BigDecimal valorFinal; // Valor informado ao finalizar o agendamento (pode ser diferente)

    // ── Sinal/Adiantamento (V76) ─────────────────────────────────────────────
    /** Valor do sinal pago. NULL = sem sinal. Diferente de valorFinal. */
    @Column(name = "valor_sinal", precision = 12, scale = 2)
    private BigDecimal valorSinal;

    /** TRUE quando o cliente pagou o sinal — pode confirmar o agendamento. */
    @Column(name = "sinal_pago", nullable = false)
    @Builder.Default
    private Boolean sinalPago = false;

    @Column(name = "sinal_data_pagamento")
    private LocalDateTime sinalDataPagamento;

    @Column(name = "sinal_forma_pagamento", length = 40)
    private String sinalFormaPagamento;

    /** #163: gestor confirmou explicitamente sem sinal — esconde botão "Receber Sinal". */
    @Column(name = "confirmado_sem_sinal", nullable = false)
    @Builder.Default
    private Boolean confirmadoSemSinal = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusAgendamento status = StatusAgendamento.AGENDADO;

    @OneToOne(mappedBy = "agendamento", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Pagamento pagamento;

    @OneToOne(mappedBy = "agendamento", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private NotaFiscal notaFiscal;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataAtualizacao;

    // Auditoria de reabertura (V71) — quando gestor reabre CONCLUIDO/PROCEDIMENTO_FIM
    // pra corrigir algo (valor, profissional, etc). valorFinal é zerado nesse momento
    // e o profissional precisa finalizar de novo informando o novo valor.
    @Column(name = "motivo_reabertura", columnDefinition = "TEXT")
    private String motivoReabertura;

    @Column(name = "data_reabertura")
    private LocalDateTime dataReabertura;

    @Column(name = "reaberto_por", length = 255)
    private String reabertoPor;

    // Campos de recorrência
    @Column(name = "agendamento_recorrente")
    @Builder.Default
    private Boolean agendamentoRecorrente = false;

    @Column(name = "agendamento_original_id")
    private Long agendamentoOriginalId; // ID do primeiro agendamento da série

    @Column(name = "serie_recorrencia_id")
    private String serieRecorrenciaId; // ID único para identificar todos os agendamentos da mesma série

    @Column(name = "lembrete_confirmacao_enviado")
    @Builder.Default
    private Boolean lembreteConfirmacaoEnviado = false;

    @Column(name = "lembrete_24h_enviado")
    @Builder.Default
    private Boolean lembrete24hEnviado = false;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}

