package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReclamacaoDTO {

    private Long id;

    @NotBlank(message = "Mensagem é obrigatória")
    private String mensagem;

    private Long unidadeId;

    private Boolean lida;

    private LocalDateTime dataCriacao;

    private LocalDateTime dataLeitura;
}
