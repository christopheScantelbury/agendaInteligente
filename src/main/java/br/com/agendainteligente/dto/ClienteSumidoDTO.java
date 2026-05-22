package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteSumidoDTO {
    private Long clienteId;
    private String clienteNome;
    private String clienteTelefone;
    private LocalDateTime ultimoAtendimento;
    private Long diasSemRetorno;
    private Long totalAtendimentos;
}
