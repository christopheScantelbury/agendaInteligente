package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "usuarios")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Usuario implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    // Campos específicos de Cliente
    @Column(length = 14, unique = true)
    private String cpfCnpj; // CPF/CNPJ (único para clientes)

    @Column(name = "data_nascimento")
    private java.time.LocalDate dataNascimento;

    @Column(length = 20)
    private String rg;

    @Column(length = 200)
    private String endereco;

    @Column(length = 10)
    private String numero;

    @Column(length = 100)
    private String complemento;

    @Column(length = 100)
    private String bairro;

    @Column(length = 8)
    private String cep;

    @Column(length = 100)
    private String cidade;

    @Column(length = 2)
    private String uf;

    // Campos específicos de Atendente/Gerente
    @Column(length = 14)
    private String cpf; // CPF para atendentes/gerentes (diferente de cpfCnpj)

    @Column(length = 20)
    private String telefone;

    @Column(name = "percentual_comissao", precision = 5, scale = 2)
    @Builder.Default
    private java.math.BigDecimal percentualComissao = java.math.BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "perfil_sistema", length = 20)
    private PerfilUsuario perfilSistema; // Perfil do sistema (ADMIN, GERENTE, etc)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "perfil_id")
    private Perfil perfil; // Perfil customizado (pode ser null se usar perfilSistema)

    // Método helper para obter a entidade Perfil
    public Perfil getPerfilEntity() {
        return perfil;
    }

    // Método helper para obter o perfil atual (enum)
    public PerfilUsuario getPerfil() {
        if (perfilSistema != null) {
            return perfilSistema;
        }
        // Se tiver perfil customizado, retorna baseado no nome do perfil
        if (perfil != null && perfil.getNome() != null) {
            try {
                return PerfilUsuario.valueOf(perfil.getNome().toUpperCase());
            } catch (IllegalArgumentException e) {
                return PerfilUsuario.PROFISSIONAL; // Default
            }
        }
        return PerfilUsuario.PROFISSIONAL; // Default
    }

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataAtualizacao;

    @Column(length = 255)
    private String tokenRecuperacaoSenha;

    @Column
    private LocalDateTime tokenRecuperacaoSenhaExpiracao;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "usuario_unidades",
        joinColumns = @JoinColumn(name = "usuario_id"),
        inverseJoinColumns = @JoinColumn(name = "unidade_id")
    )
    private List<Unidade> unidades;

    // Relação com serviços (para atendentes/profissionais)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "atendente_servicos",
        joinColumns = @JoinColumn(name = "atendente_id"),
        inverseJoinColumns = @JoinColumn(name = "servico_id")
    )
    private List<Servico> servicos;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        PerfilUsuario perfilAtual = getPerfil();
        return List.of(new SimpleGrantedAuthority("ROLE_" + perfilAtual.name()));
    }

    @Override
    public String getPassword() {
        return senha;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return ativo;
    }

    public enum PerfilUsuario {
        ADMIN,           // Acesso total a todas as empresas
        GERENTE,         // Gerencia uma clínica específica
        PROFISSIONAL,    // Profissional/Atendente - gerencia seus horários
        CLIENTE          // Cliente - apenas agendamentos próprios
    }
}

