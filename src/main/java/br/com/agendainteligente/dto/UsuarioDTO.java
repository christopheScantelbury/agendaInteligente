package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import jakarta.validation.constraints.Email;
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
public class UsuarioDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    @NotBlank(message = "Email é obrigatório")
    @Email(message = "Email inválido")
    private String email;

    private String senha; // Opcional na atualização

    private PerfilUsuario perfilSistema; // Perfil do sistema (ADMIN, GERENTE, etc)
    private Long perfilId; // ID do perfil customizado (opcional)

    private Long unidadeId; // Unidade à qual o usuário pertence (para GERENTE)
    
    // Campo de compatibilidade - será mapeado para perfilSistema
    private PerfilUsuario perfil;

    private Boolean ativo;

    // Para exibição
    private String nomeUnidade;
}
