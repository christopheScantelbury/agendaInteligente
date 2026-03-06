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
public class ConviteClienteRespostaDTO {
    private Long id;
    private String token;
    private String link;
    private Long unidadeId;
    private String unidadeNome;
    private LocalDateTime dataExpiracao;
    private LocalDateTime usadoEm;
    private LocalDateTime dataCriacao;
}
