package br.com.agendainteligente.dto;

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
public class AtendenteDTO {
    
    private Long id;
    
    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId;
    
    @NotNull(message = "Usuário é obrigatório")
    private Long usuarioId;
    
    @NotBlank(message = "CPF é obrigatório")
    private String cpf;
    
    private String telefone;
    private Boolean ativo;
    
    // Para exibição
    private String nomeUsuario;
    private String nomeUnidade;
}

