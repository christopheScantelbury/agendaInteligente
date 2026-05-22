package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnamneseDTO {

    private Long id;

    @NotNull(message = "Cliente é obrigatório")
    private Long clienteId;
    private String clienteNome;

    private Long servicoId;
    private String servicoNome;

    private Long templateId;
    private String templateNome;

    @NotNull(message = "Data é obrigatória")
    private LocalDate data;

    // Questionário
    private Boolean usaRimel;
    private String usaRimelObs;

    private Boolean procedimentosRecentesOlhos;
    private String procedimentosRecentesOlhosObs;

    private Boolean alergias;
    private String alergiasObs;

    private Boolean problemasOculares;
    private String problemasOcularesObs;

    private Boolean tratamentoOncologico;
    private String tratamentoOncologicoObs;

    private Boolean tireoide;
    private String tireoidedObs;

    private Boolean dormeDeLado;
    private String dormeDeLadoObs;

    private Boolean gravidez;
    private String gravidezObs;

    private Boolean outrosProblemas;
    private String outrosProblemasDescricao;

    // Avaliação
    private String mapping;
    private String marcaFios;
    private String espessura;
    private String curvatura;
    private String adesivo;

    // Uso de imagem
    private Boolean usoImagem;

    // Observações
    private String observacoes;

    // Auditoria
    private Long unidadeId;
    private LocalDateTime dataCriacao;
    private LocalDateTime dataAtualizacao;
}
