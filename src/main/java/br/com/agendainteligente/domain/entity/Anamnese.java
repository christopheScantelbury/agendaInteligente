package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "anamneses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Anamnese {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servico_id")
    private Servico servico;

    @Column(name = "servico_nome", length = 200)
    private String servicoNome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private AnamneseTemplate template;

    @Column(nullable = false)
    private LocalDate data;

    // Questionário
    @Column(name = "usa_rimel")
    private Boolean usaRimel;

    @Column(name = "usa_rimel_obs", length = 500)
    private String usaRimelObs;

    @Column(name = "procedimentos_recentes_olhos")
    private Boolean procedimentosRecentesOlhos;

    @Column(name = "procedimentos_recentes_olhos_obs", length = 500)
    private String procedimentosRecentesOlhosObs;

    @Column(name = "alergias")
    private Boolean alergias;

    @Column(name = "alergias_obs", length = 500)
    private String alergiasObs;

    @Column(name = "problemas_oculares")
    private Boolean problemasOculares;

    @Column(name = "problemas_oculares_obs", length = 500)
    private String problemasOcularesObs;

    @Column(name = "tratamento_oncologico")
    private Boolean tratamentoOncologico;

    @Column(name = "tratamento_oncologico_obs", length = 500)
    private String tratamentoOncologicoObs;

    @Column(name = "tireoide")
    private Boolean tireoide;

    @Column(name = "tireoide_obs", length = 500)
    private String tireoidedObs;

    @Column(name = "dorme_de_lado")
    private Boolean dormeDeLado;

    @Column(name = "dorme_de_lado_obs", length = 500)
    private String dormeDeLadoObs;

    @Column(name = "gravidez")
    private Boolean gravidez;

    @Column(name = "gravidez_obs", length = 500)
    private String gravidezObs;

    @Column(name = "outros_problemas")
    private Boolean outrosProblemas;

    @Column(name = "outros_problemas_descricao", columnDefinition = "TEXT")
    private String outrosProblemasDescricao;

    // Avaliação
    @Column(name = "mapping", length = 200)
    private String mapping;

    @Column(name = "marca_fios", length = 200)
    private String marcaFios;

    @Column(name = "espessura", length = 100)
    private String espessura;

    @Column(name = "curvatura", length = 100)
    private String curvatura;

    @Column(name = "adesivo", length = 200)
    private String adesivo;

    // Uso de imagem
    @Column(name = "uso_imagem", nullable = false)
    @Builder.Default
    private Boolean usoImagem = false;

    // Observações
    @Column(name = "observacoes", columnDefinition = "TEXT")
    private String observacoes;

    /** JSON com respostas de perguntas dinâmicas do template: { perguntaId: {valor, obs} } */
    @Column(columnDefinition = "jsonb")
    private String respostas;

    // Auditoria
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "unidade_id")
    private Unidade unidade;

    @Column(name = "data_criacao", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "data_atualizacao")
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
