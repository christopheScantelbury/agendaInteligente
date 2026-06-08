package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Configuração da Landing Page. Registro singleton (id=1).
 * Editável apenas por ADMIN GLOBAL.
 */
@Entity
@Table(name = "landing_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LandingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Conteúdo livre (hero/stats/destaques/comparativo/footerCta). Schema validado no frontend. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> conteudo;

    @Column(name = "atualizado_por_id")
    private Long atualizadoPorId;

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
