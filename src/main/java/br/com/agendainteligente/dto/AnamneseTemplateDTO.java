package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnamneseTemplateDTO {
    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String descricao;
    private Boolean ativo;
    private Long unidadeId;

    /** Lista de perguntas estruturadas. Cada pergunta tem id/label/tipo. */
    private List<Pergunta> perguntas;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pergunta {
        /** Identificador único da pergunta dentro do template (slug) */
        private String id;
        /** Texto da pergunta exibido no formulário */
        private String label;
        /** Tipo: sim_nao | texto | numero */
        private String tipo;
        /** Se true, exibe campo de observação ao lado da resposta sim/não */
        private Boolean comObservacao;
    }
}
