package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.RecorrenciaDespesa;
import br.com.agendainteligente.domain.enums.StatusDespesa;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "despesas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Despesa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String nome;

    @Column(length = 1000)
    private String descricao;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(name = "data_competencia", nullable = false)
    private LocalDate dataCompetencia;

    @Column(name = "data_vencimento", nullable = false)
    private LocalDate dataVencimento;

    @Column(name = "data_pagamento")
    private LocalDate dataPagamento;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_id", nullable = false)
    private CategoriaDespesa categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id", nullable = false)
    private Unidade unidade;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    @Column(length = 200)
    private String fornecedor;

    @Column(name = "forma_pagamento", length = 40)
    private String formaPagamento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusDespesa status = StatusDespesa.RASCUNHO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RecorrenciaDespesa recorrencia = RecorrenciaDespesa.NENHUMA;

    @Column(name = "despesa_origem_id")
    private Long despesaOrigemId;

    /** #143: posicao da parcela (1..N). null quando nao e parcelada. */
    @Column(name = "numero_parcela")
    private Integer numeroParcela;

    /** #143: total de parcelas do grupo. */
    @Column(name = "total_parcelas")
    private Integer totalParcelas;

    @Column(nullable = false)
    @Builder.Default
    private Boolean reembolsavel = false;

    @Column(name = "centro_custo", length = 80)
    private String centroCusto;

    @Column(name = "criado_por_id")
    private Long criadoPorId;

    @Column(name = "atualizado_por_id")
    private Long atualizadoPorId;

    @Column(name = "aprovado_por_id")
    private Long aprovadoPorId;

    @Column(name = "pago_por_id")
    private Long pagoPorId;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_atualizacao", nullable = false)
    private LocalDateTime dataAtualizacao;

    @PrePersist
    void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
