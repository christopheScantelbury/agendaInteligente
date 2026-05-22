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
public class ClienteRetornoDTO {
    private Long clienteId;
    private String clienteNome;
    private String clienteTelefone;
    private LocalDateTime ultimoAtendimento;
    private LocalDateTime dataRetorno;
    private Long diasParaRetorno;
    private Long totalAtendimentos;
}
