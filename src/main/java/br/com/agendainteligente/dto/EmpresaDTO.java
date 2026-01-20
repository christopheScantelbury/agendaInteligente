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
public class EmpresaDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String razaoSocial;
    private String cnpj;
    private String email;
    private String telefone;
    private String endereco;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    private Boolean ativo;
    
    private String logo;
    private String corApp;
}
