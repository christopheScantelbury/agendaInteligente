package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnamneseResumoDTO {
    private Long id;
    private String clienteNome;
    private String servicoNome;
    private String templateNome;
    private LocalDate data;
}
