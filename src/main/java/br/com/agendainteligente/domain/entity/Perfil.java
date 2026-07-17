package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "perfis")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Perfil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Nome livre do cargo ("Cabeleireira", "Recepção"). Único DENTRO do tenant
     * (V81) — duas empresas podem ter cargos de mesmo nome.
     */
    @Column(nullable = false, length = 50)
    private String nome;

    /**
     * #171: tenant dono do cargo. NULL = perfil de sistema global.
     * Toda listagem DEVE filtrar por isto — ver feedback-isolamento-administrador.
     */
    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    /**
     * #171: enum que define as PERMISSÕES REAIS do cargo. O nome é livre, mas o
     * comportamento no backend (isolamento multi-tenant, comissões, NF-e) vem
     * daqui — por isso continua sendo enum fechado.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "perfil_sistema_base", nullable = false, length = 20)
    @Builder.Default
    private Usuario.PerfilUsuario perfilSistemaBase = Usuario.PerfilUsuario.PROFISSIONAL;

    @Column(length = 200)
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean sistema = false; // true para perfis do sistema (ADMIN, GERENTE, etc)

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    /** Indica se este perfil é de atendente/profissional (presta serviços). */
    @Column(nullable = false)
    @Builder.Default
    private Boolean atendente = false;

    /** Indica se este perfil é de cliente. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean cliente = false;

    /** Indica se este perfil é de gerente. */
    @Column(nullable = false)
    @Builder.Default
    private Boolean gerente = false;

    // Permissões de menu (JSON ou tabela separada)
    @Column(name = "permissoes_menu", columnDefinition = "TEXT")
    private String permissoesMenu; // JSON com lista de menus permitidos (compatibilidade)
    
    // Permissões granulares (JSON com Map<menu, tipo>)
    @Column(name = "permissoes_granulares", columnDefinition = "TEXT")
    private String permissoesGranulares; // JSON com Map<String, String> onde tipo pode ser "EDITAR", "VISUALIZAR", "SEM_ACESSO"

    @OneToMany(mappedBy = "perfil", fetch = FetchType.LAZY)
    private List<Usuario> usuarios;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataAtualizacao;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
        // Guard: MapStruct/new Perfil() ignoram @Builder.Default e deixariam
        // NOT NULL como null (mesma armadilha que quebrou Unidade e Empresa).
        if (perfilSistemaBase == null) perfilSistemaBase = Usuario.PerfilUsuario.PROFISSIONAL;
        if (sistema == null) sistema = false;
        if (ativo == null) ativo = true;
        if (atendente == null) atendente = false;
        if (cliente == null) cliente = false;
        if (gerente == null) gerente = false;
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
