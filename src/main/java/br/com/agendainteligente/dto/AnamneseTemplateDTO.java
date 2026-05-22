package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnamneseTemplateDTO {
    private Long id;
    private String nome;
    private String descricao;
    private Boolean ativo;
    private Long unidadeId;
}
