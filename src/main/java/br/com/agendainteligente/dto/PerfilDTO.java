package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PerfilDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String descricao;
    private Boolean sistema;
    private Boolean ativo;
    private Boolean atendente; // true = perfil de atendente/profissional
    private Boolean cliente;   // true = perfil de cliente
    private Boolean gerente;  // true = perfil de gerente
    private List<String> permissoesMenu; // Lista de paths de menus permitidos (compatibilidade)
    private java.util.Map<String, String> permissoesGranulares; // Map<menu, tipo> onde tipo pode ser "EDITAR", "VISUALIZAR", "SEM_ACESSO"
}
