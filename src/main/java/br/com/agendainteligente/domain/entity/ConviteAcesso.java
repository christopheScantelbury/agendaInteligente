package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "convite_acesso")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConviteAcesso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "max_unidades", nullable = false)
    @Builder.Default
    private Integer maxUnidades = 1;

    @Column(name = "data_expiracao_link", nullable = false)
    private LocalDateTime dataExpiracaoLink;

    @Column(name = "data_expiracao_acesso", nullable = false)
    private LocalDate dataExpiracaoAcesso;

    @Column(name = "usado_em")
    private LocalDateTime usadoEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criado_por_id")
    private Usuario criadoPor;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataAtualizacao;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }

    public boolean isUsado() {
        return usadoEm != null;
    }

    public boolean isLinkExpirado() {
        return LocalDateTime.now().isAfter(dataExpiracaoLink);
    }
}
