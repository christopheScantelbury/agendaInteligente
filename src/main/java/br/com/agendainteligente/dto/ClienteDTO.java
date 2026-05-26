package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteDTO {
    
    private Long id;
    
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    
    @Pattern(regexp = "^$|\\d{11}|\\d{14}", message = "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos")
    private String cpfCnpj;

    /** Setter defensivo: aceita CPF/CNPJ com ou sem máscara (#67). */
    public void setCpfCnpj(String cpfCnpj) {
        this.cpfCnpj = cpfCnpj == null ? null : cpfCnpj.replaceAll("\\D", "");
    }
    
    @Email(message = "Email inválido")
    private String email;
    
    private String telefone;
    private String endereco;
    private String observacao;
    private String numero;
    private String complemento;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    
    private LocalDate dataNascimento;
    private String rg;
    
    // Senha para criação de usuário (opcional). WRITE_ONLY — nunca volta na resposta (BUG-06 do QA Sprint 6).
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String senha;
    
    private Long unidadeId; // Unidade principal do cliente
    
    // Unidades associadas ao cliente (para entrada - apenas IDs) - unidades adicionais
    private List<Long> unidadesIds;
    
    // Unidades completas (para saída - objetos UnidadeDTO)
    private List<UnidadeDTO> unidades;
}
