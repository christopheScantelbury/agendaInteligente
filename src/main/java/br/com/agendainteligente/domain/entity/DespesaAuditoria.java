package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "despesa_auditoria")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DespesaAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "despesa_id", nullable = false)
    private Long despesaId;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false, length = 40)
    private String acao;

    @Column(name = "status_anterior", length = 20)
    private String statusAnterior;

    @Column(name = "status_novo", length = 20)
    private String statusNovo;

    @Column(length = 500)
    private String observacao;

    @Column(name = "data_acao", nullable = false, updatable = false)
    private LocalDateTime dataAcao;

    @PrePersist
    void onCreate() {
        dataAcao = LocalDateTime.now();
    }
}
