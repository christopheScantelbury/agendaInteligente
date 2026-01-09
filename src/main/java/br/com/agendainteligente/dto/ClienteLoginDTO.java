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
public class ClienteLoginDTO {
    
    @NotBlank(message = "Email ou CPF/CNPJ é obrigatório")
    private String emailOuCpf;
    
    @NotBlank(message = "Senha é obrigatória")
    private String senha;
}



