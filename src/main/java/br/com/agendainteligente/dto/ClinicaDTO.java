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
public class ClinicaDTO {
    
    private Long id;
    
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    
    private String razaoSocial;
    
    @NotBlank(message = "CNPJ é obrigatório")
    private String cnpj;
    
    private String endereco;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    private String telefone;
    private String email;
    private Boolean ativo;
}

