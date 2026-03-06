package br.com.agendainteligente.dto;

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
public class ConviteAcessoRespostaDTO {
    private Long id;
    private String token;
    private String link;
    private Integer maxUnidades;
    private LocalDateTime dataExpiracaoLink;
    private LocalDate dataExpiracaoAcesso;
    private LocalDateTime usadoEm;
    private LocalDateTime dataCriacao;
}
