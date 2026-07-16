package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
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
    // @Builder.Default + guard no onCreate: qualquer caminho que crie Unidade sem
    // informar horário recebe o padrão comercial em vez de estourar NOT NULL.
    @Column(name = "horario_abertura", nullable = false)
    @Builder.Default
    private java.time.LocalTime horarioAbertura = java.time.LocalTime.of(8, 0);

    @Column(name = "horario_fechamento", nullable = false)
    @Builder.Default
    private java.time.LocalTime horarioFechamento = java.time.LocalTime.of(18, 0);

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

    // ── Sinal/Adiantamento (V76) ────────────────────────────────────────────
    /** Se TRUE, agendamentos pedem sinal antes de virar CONFIRMADO. */
    @Column(name = "cobra_sinal", nullable = false)
    @Builder.Default
    private Boolean cobraSinal = false;

    /** Percentual do valor total cobrado como sinal (0–100). */
    @Column(name = "percentual_sinal", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal percentualSinal = new BigDecimal("30.00");

    // ── Flags de fluxo de atendimento (V78 / issue #157) ─────────────────────
    /** Bloqueia CONFIRMADO→EM_ANDAMENTO se cobra_sinal=true e sinal_pago=false. */
    @Column(name = "requer_sinal_pra_iniciar", nullable = false)
    @Builder.Default
    private Boolean requerSinalPraIniciar = false;

    /** Quando false, finalizar exige valorFinal > 0. */
    @Column(name = "permite_finalizar_sem_pagamento", nullable = false)
    @Builder.Default
    private Boolean permiteFinalizarSemPagamento = true;

    /** Quando false, perfil CLIENTE não cancela após status CONFIRMADO. */
    @Column(name = "cliente_pode_cancelar_apos_confirmar", nullable = false)
    @Builder.Default
    private Boolean clientePodeCancelarAposConfirmar = true;

    /** Antecedência (horas) do lembrete automático de confirmação (1-168). */
    @Column(name = "lembrete_confirmacao_horas", nullable = false)
    @Builder.Default
    private Short lembreteConfirmacaoHoras = 24;

    // ── Integração NotaFácil (Nota MEI Gateway) ─────────────────────────────
    @Column(name = "notafacil_api_key", length = 255)
    private String notafacilApiKey;

    @Column(name = "municipio_ibge", length = 7)
    private String municipioIbge;

    @Column(name = "notafacil_ativo", nullable = false)
    @Builder.Default
    private Boolean notafacilAtivo = false;

    /** #159: timestamp do provisionamento automático via NotaFacilProvisioningService. */
    @Column(name = "notafacil_provisionado_em")
    private LocalDateTime notafacilProvisionadoEm;

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
        // Rede de segurança: MapStruct/new Unidade() ignoram @Builder.Default e
        // deixariam os horários null → violação de NOT NULL (V70) no INSERT.
        if (horarioAbertura == null) horarioAbertura = java.time.LocalTime.of(8, 0);
        if (horarioFechamento == null) horarioFechamento = java.time.LocalTime.of(18, 0);
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}
