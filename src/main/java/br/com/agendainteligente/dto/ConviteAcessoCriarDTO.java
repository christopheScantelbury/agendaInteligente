package br.com.agendainteligente.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConviteAcessoCriarDTO {

    @NotNull
    @Min(1)
    @Max(100)
    private Integer maxUnidades;

    @NotNull
    private LocalDateTime dataExpiracaoLink;

    @NotNull
    private LocalDate dataExpiracaoAcesso;

    /**
     * #171: cargo que o convidado assume. Define o perfilSistema via
     * perfilSistemaBase. NULL = legado (perfil decidido pelo tipo do link).
     */
    private Long perfilId;
}
