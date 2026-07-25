package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** #174: um atendimento do histórico da cliente. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtendimentoHistoricoDTO {

    private Long id;

    @NotNull(message = "Cliente é obrigatório")
    private Long clienteId;

    private String clienteNome;

    @NotNull(message = "Data é obrigatória")
    private LocalDate data;

    private String avaliacaoInicial;
    private String procedimento;
    private String orientacoes;
    private String observacoes;
    private String fotos;
    private LocalDate proximaManutencao;

    private LocalDateTime dataCriacao;
    private LocalDateTime dataAtualizacao;
}
