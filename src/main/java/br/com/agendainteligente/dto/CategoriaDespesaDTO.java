package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoriaDespesaDTO {
    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String cor;
    private Boolean ativo;
    private Long adminUnicoId;
    private Boolean padrao; // categoria global (admin_unico_id NULL)
}
