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
 * Audit log de ações sensíveis. #95 (S6-3).
 * Grava: login, logout, criar/excluir usuário, alterar senha, impersonação, etc.
 */
@Entity
@Table(name = "audit_log")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    @Column(name = "autor_id")
    private Long autorId;

    @Column(name = "autor_email", length = 255)
    private String autorEmail;

    @Column(name = "autor_perfil", length = 50)
    private String autorPerfil;

    @Column(name = "tipo_acao", length = 80, nullable = false)
    private String tipoAcao;

    @Column(length = 80)
    private String entidade;

    @Column(name = "entidade_id")
    private Long entidadeId;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(length = 45)
    private String ip;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "empresa_id")
    private Long empresaId;

    @Column(name = "impersonated_by")
    private Long impersonatedBy;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) timestamp = LocalDateTime.now();
    }
}
