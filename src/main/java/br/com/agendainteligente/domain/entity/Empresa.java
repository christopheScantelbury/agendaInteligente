package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "empresas")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Empresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 200)
    private String razaoSocial;

    @Column(length = 14, unique = true)
    private String cnpj;

    @Column(length = 100)
    private String email;

    @Column(length = 20)
    private String telefone;

    @Column(length = 200)
    private String endereco;

    @Column(length = 10)
    private String numero;

    @Column(length = 100)
    private String bairro;

    @Column(length = 8)
    private String cep;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String uf;

    @Column(name = "logo", columnDefinition = "TEXT")
    private String logo;

    @Column(name = "cor_app", length = 7)
    private String corApp;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "categoria", nullable = false, length = 40)
    @Builder.Default
    private CategoriaEmpresa categoria = CategoriaEmpresa.OUTROS;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    /** Slug público da empresa (usado em /e/{slug}). Único quando preenchido, opcional. */
    @Column(name = "slug_publico", length = 60, unique = true)
    private String slugPublico;

    @Column(name = "data_expiracao_acesso")
    private java.time.LocalDate dataExpiracaoAcesso;

    @OneToMany(mappedBy = "empresa", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Unidade> unidades;

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
