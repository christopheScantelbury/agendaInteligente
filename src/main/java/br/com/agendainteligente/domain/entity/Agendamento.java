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

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valorTotal; // Soma dos serviços

    @Column(precision = 10, scale = 2)
    private BigDecimal valorFinal; // Valor informado ao finalizar o agendamento (pode ser diferente)

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

    // Campos de recorrência
    @Column(name = "agendamento_recorrente")
    @Builder.Default
    private Boolean agendamentoRecorrente = false;

    @Column(name = "agendamento_original_id")
    private Long agendamentoOriginalId; // ID do primeiro agendamento da série

    @Column(name = "serie_recorrencia_id")
    private String serieRecorrenciaId; // ID único para identificar todos os agendamentos da mesma série

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

