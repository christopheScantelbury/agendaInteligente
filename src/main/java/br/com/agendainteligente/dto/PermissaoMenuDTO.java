package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissaoMenuDTO {
    private String menu; // Path do menu (ex: "/clientes")
    private String tipo; // "EDITAR", "VISUALIZAR", "SEM_ACESSO"
}
