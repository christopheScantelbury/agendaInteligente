package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CadastroAdminDTO {

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    @NotBlank(message = "Área de atuação é obrigatória")
    private String areaAtuacao;

    @NotNull(message = "Quantidade de unidades é obrigatória")
    @Min(value = 1, message = "Quantidade de unidades deve ser maior que zero")
    private Integer quantidadeUnidades;

    private String telefone;

    @NotBlank(message = "Senha é obrigatória")
    private String senha;
}
