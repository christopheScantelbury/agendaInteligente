package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "unidades")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Unidade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(length = 200)
    private String descricao;

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

    @Column(length = 20)
    private String telefone;

    @Column(length = 100)
    private String email;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativo = true;

    @Column(name = "horario_abertura")
    private java.time.LocalTime horarioAbertura;

    @Column(name = "horario_fechamento")
    private java.time.LocalTime horarioFechamento;

    @Column(length = 14)
    private String cnpj;

    @Column(name = "inscricao_municipal", length = 20)
    private String inscricaoMunicipal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

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
