package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteTokenDTO {
    private String token;
    private String tipo;
    private Long clienteId;
    private String nome;
    private String email;
}



