package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

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

    private Long unidadeId; // Unidade à qual o usuário pertence (para GERENTE) - DEPRECATED, usar unidadesIds
    
    private List<Long> unidadesIds; // Lista de IDs das unidades às quais o usuário tem acesso
    
    // Campo de compatibilidade - será mapeado para perfilSistema
    private PerfilUsuario perfil;

    private Boolean ativo;

    // Para exibição
    private String nomeUnidade;
    private List<String> nomesUnidades; // Lista de nomes das unidades para exibição

    // Campos específicos de Cliente
    private String cpfCnpj; // CPF/CNPJ (único para clientes)
    private LocalDate dataNascimento;
    private String rg;
    private String endereco;
    private String numero;
    private String complemento;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;

    // Campos específicos de Atendente/Gerente
    private String cpf; // CPF para atendentes/gerentes
    private String telefone;
    private BigDecimal percentualComissao;

    // Serviços do atendente
    private List<Long> servicosIds;
}
