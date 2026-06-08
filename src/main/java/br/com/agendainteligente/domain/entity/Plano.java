package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * #138 + #139: Plano comercial da empresa.
 * Trial / Starter / Pro / Business.
 * Define limites operacionais + cota mensal de NFS-e via parceria NotaFácil.
 */
@Entity
@Table(name = "planos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Plano {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Chave técnica: TRIAL / STARTER / PRO / BUSINESS. */
    @Column(nullable = false, unique = true, length = 40)
    private String nome;

    /** Exibição: "Trial", "Starter", "Pro", "Business". */
    @Column(name = "nome_publico", nullable = false, length = 80)
    private String nomePublico;

    @Column(length = 500)
    private String descricao;

    @Column(name = "preco_mensal_brl", nullable = false, precision = 10, scale = 2)
    private BigDecimal precoMensalBrl;

    /** NULL = ilimitado. */
    @Column(name = "limite_unidades")
    private Integer limiteUnidades;

    @Column(name = "limite_profissionais")
    private Integer limiteProfissionais;

    @Column(name = "limite_agendamentos_mes")
    private Integer limiteAgendamentosMes;

    /** #138: cota mensal de NFS-e via NotaFácil. 0 = sem NFS-e. */
    @Column(name = "limite_nfse_mes", nullable = false)
    private Integer limiteNfseMes;

    /** #138: BRL por NFS-e acima de limite_nfse_mes. */
    @Column(name = "preco_excedente_nfse_brl", precision = 10, scale = 4)
    private BigDecimal precoExcedenteNfseBrl;

    /** Só preenchido pro TRIAL (em dias). */
    @Column(name = "duracao_trial_dias")
    private Integer duracaoTrialDias;

    @Column(nullable = false)
    @Builder.Default
    private Integer ordem = 0;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @PrePersist
    void onCreate() {
        dataCriacao = LocalDateTime.now();
    }
}
