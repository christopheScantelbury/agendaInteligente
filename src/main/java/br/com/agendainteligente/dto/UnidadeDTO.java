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
public class UnidadeDTO {
    
    private Long id;
    
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    
    private String descricao;
    private String endereco;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    private String telefone;
    private String email;
    private Boolean ativo;
    
    private Long clinicaId; // ID da clínica à qual a unidade pertence
    
    // Para exibição
    private String nomeClinica;
}

