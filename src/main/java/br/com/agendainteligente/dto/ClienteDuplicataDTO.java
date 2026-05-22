package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteDuplicataDTO {
    private List<ClienteDTO> clientes;
    private String motivoSimilaridade; // "nome" ou "telefone"
}
