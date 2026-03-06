package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConviteClienteCriarDTO {

    @NotNull
    private Long unidadeId;

    @NotNull
    private LocalDateTime dataExpiracao;
}
