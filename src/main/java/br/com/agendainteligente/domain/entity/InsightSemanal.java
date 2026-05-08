package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "insights_semanais")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InsightSemanal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "unidade_id")
    private Long unidadeId;

    @Column(nullable = false)
    private LocalDate semana;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String texto;

    @Column(name = "criado_em", updatable = false)
    private LocalDateTime criadoEm;

    @PrePersist
    protected void onCreate() {
        criadoEm = LocalDateTime.now();
    }
}
