package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.TipoComissao;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "comissao_regras")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComissaoRegra {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "atendente_id", nullable = false)
    private Atendente atendente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id")
    private Servico servico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoComissao tipo;

    @Column(nullable = false, precision = 12, scale = 4)
    private BigDecimal valor;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

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
