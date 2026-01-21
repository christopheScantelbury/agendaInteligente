package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    
    @NotBlank(message = "CPF/CNPJ é obrigatório")
    @Pattern(regexp = "\\d{11}|\\d{14}", message = "CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos")
    private String cpfCnpj;
    
    @Email(message = "Email inválido")
    private String email;
    
    private String telefone;
    private String endereco;
    private String numero;
    private String complemento;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    
    @NotNull(message = "Data de nascimento é obrigatória")
    private LocalDate dataNascimento;
    private String rg;
    
    // Senha para criação de usuário (opcional, não é persistida na entidade Cliente)
    private String senha;
    
    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId; // Unidade principal do cliente
    
    // Unidades associadas ao cliente (para entrada - apenas IDs) - unidades adicionais
    private List<Long> unidadesIds;
    
    // Unidades completas (para saída - objetos UnidadeDTO)
    private List<UnidadeDTO> unidades;
}

