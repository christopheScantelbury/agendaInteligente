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
public class RecuperacaoSenhaDTO {
    
    @NotBlank(message = "Email ou CPF é obrigatório")
    private String emailOuCpf;
}

