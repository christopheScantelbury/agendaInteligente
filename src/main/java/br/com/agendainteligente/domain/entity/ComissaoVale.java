package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * #142: Vale/Adiantamento de comissao.
 * Status PENDENTE = ainda nao descontado. DESCONTADO = abatido num ComissaoPagamento.
 */
@Entity
@Table(name = "comissao_vales")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoVale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id", nullable = false)
    private Atendente atendente;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valor;

    @Column(name = "data_vale", nullable = false)
    private LocalDate dataVale;

    @Column(length = 500)
    private String observacao;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Status status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pagamento_id")
    private ComissaoPagamento pagamento;

    @Column(name = "criado_por_id")
    private Long criadoPorId;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_descontado")
    private LocalDateTime dataDescontado;

    public enum Status { PENDENTE, DESCONTADO }

    @PrePersist
    void onCreate() {
        if (dataVale == null) dataVale = LocalDate.now();
        if (status == null) status = Status.PENDENTE;
        dataCriacao = LocalDateTime.now();
    }
}
