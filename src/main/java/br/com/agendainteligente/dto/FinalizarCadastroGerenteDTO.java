package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Cadastro finalizado quando o convite foi criado pelo ADMINISTRADOR (dono do tenant).
 * Cria um GERENTE vinculado à empresa existente do convidador — não cria empresa nova.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizarCadastroGerenteDTO {

    @NotBlank
    @Size(min = 2, max = 100)
    private String nome;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    @Size(min = 6)
    private String senha;

    @NotBlank
    @Size(min = 11, max = 14)
    private String cpf;

    @Size(max = 20)
    private String telefone;

    /** Unidades da empresa do convidador onde o gerente vai atuar. */
    @NotEmpty
    private List<Long> unidadesIds;
}
