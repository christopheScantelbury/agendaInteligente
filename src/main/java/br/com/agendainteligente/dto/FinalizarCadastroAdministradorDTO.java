package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Cadastro finalizado quando o convite foi criado pelo ADMIN global da plataforma.
 * Cria um novo ADMINISTRADOR (dono de tenant) + empresa nova + unidades.
 * Fluxo de onboarding de cliente novo da plataforma.
 *
 * planoId é opcional por enquanto — a integração com a tabela de planos vai entrar
 * em uma issue separada (#139). Por ora, o time aprova o plano manualmente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizarCadastroAdministradorDTO {

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
    @Size(min = 2, max = 200)
    private String nomeEmpresa;

    @NotNull
    @Size(min = 1, max = 100)
    private List<UnidadeMinimaDTO> unidades;

    /** TODO #139 — mapear pra tabela de planos. Por ora aceita mas não usa. */
    private Long planoId;
}
