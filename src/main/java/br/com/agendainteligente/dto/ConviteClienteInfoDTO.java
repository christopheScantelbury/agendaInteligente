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
public class ConviteClienteInfoDTO {
    private String token;
    private Long unidadeId;
    private String unidadeNome;
    private String empresaNome;
    private LocalDateTime dataExpiracao;
    private boolean valido;
    private String mensagemErro;
}
