package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "comissao_pagamentos")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoPagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id", nullable = false)
    private Atendente atendente;

    @Column(name = "valor_total", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorTotal;

    @Column(name = "data_pagamento", nullable = false)
    private LocalDate dataPagamento;

    @Column(name = "pago_por_id")
    private Long pagoPorId;

    @Column(name = "forma_pagamento", length = 40)
    private String formaPagamento;

    @Column(length = 500)
    private String observacao;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @PrePersist
    void onCreate() {
        if (dataPagamento == null) dataPagamento = LocalDate.now();
        dataCriacao = LocalDateTime.now();
    }
}
