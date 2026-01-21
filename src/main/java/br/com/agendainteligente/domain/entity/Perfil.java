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

    @Column(nullable = false, unique = true, length = 50)
    private String nome;

    @Column(length = 200)
    private String descricao;

    @Column(nullable = false)
    @Builder.Default
    private Boolean sistema = false; // true para perfis do sistema (ADMIN, GERENTE, etc)

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

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
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
