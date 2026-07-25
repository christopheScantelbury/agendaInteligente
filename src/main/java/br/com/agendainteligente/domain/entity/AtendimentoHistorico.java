package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * #174: um atendimento no histórico/evolução da cliente. A ficha de anamnese
 * mostra esses registros como uma linha do tempo (o mais antigo é a "cliente
 * nova", os seguintes viram "Atendimento N").
 */
@Entity
@Table(name = "atendimento_historico")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtendimentoHistorico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    /** Unidade dona (tenant). Deriva da unidade do usuário que registrou. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id")
    private Unidade unidade;

    @Column(nullable = false)
    private LocalDate data;

    @Column(name = "avaliacao_inicial", columnDefinition = "TEXT")
    private String avaliacaoInicial;

    @Column(columnDefinition = "TEXT")
    private String procedimento;

    @Column(columnDefinition = "TEXT")
    private String orientacoes;

    @Column(columnDefinition = "TEXT")
    private String observacoes;

    /** URLs/descrição das fotos, uma por linha. */
    @Column(columnDefinition = "TEXT")
    private String fotos;

    @Column(name = "proxima_manutencao")
    private LocalDate proximaManutencao;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_atualizacao")
    private LocalDateTime dataAtualizacao;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
        if (data == null) data = LocalDate.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
