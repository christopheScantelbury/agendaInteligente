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

    // Obrigatório (V70) — necessário pra fallback de slots automáticos no agendamento.
    // Migration faz backfill 08-18 pra registros antigos antes de aplicar NOT NULL.
    @Column(name = "horario_abertura", nullable = false)
    private java.time.LocalTime horarioAbertura;

    @Column(name = "horario_fechamento", nullable = false)
    private java.time.LocalTime horarioFechamento;

    @Column(length = 14)
    private String cnpj;

    @Column(name = "inscricao_municipal", length = 20)
    private String inscricaoMunicipal;

    @Column(name = "razao_social", length = 200)
    private String razaoSocial;

    @Column(name = "inscricao_estadual", length = 20)
    private String inscricaoEstadual;

    /** MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL */
    @Column(name = "regime_tributario", length = 30)
    private String regimeTributario;

    // ── Certificado Digital A1 (assinatura XML da NFS-e) ────────────────────
    @Column(name = "certificado_pfx_base64", columnDefinition = "TEXT")
    private String certificadoPfxBase64;

    @Column(name = "certificado_senha", length = 500)
    private String certificadoSenha;

    @Column(name = "certificado_cn", length = 200)
    private String certificadoCn;

    @Column(name = "certificado_valido_de")
    private java.time.LocalDate certificadoValidoDe;

    @Column(name = "certificado_valido_ate")
    private java.time.LocalDate certificadoValidoAte;

    @Column(name = "certificado_data_upload")
    private LocalDateTime certificadoDataUpload;

    @Column(name = "admin_unico_id")
    private Long adminUnicoId;

    // ── Integração NotaFácil (Nota MEI Gateway) ─────────────────────────────
    @Column(name = "notafacil_api_key", length = 255)
    private String notafacilApiKey;

    @Column(name = "municipio_ibge", length = 7)
    private String municipioIbge;

    @Column(name = "notafacil_ativo", nullable = false)
    @Builder.Default
    private Boolean notafacilAtivo = false;

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
