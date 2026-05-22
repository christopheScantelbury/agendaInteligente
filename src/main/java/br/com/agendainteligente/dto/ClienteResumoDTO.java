package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClienteResumoDTO {
    private Long id;
    private String nome;
    private String telefone;
    private String email;
    private String cpfCnpj;
    private LocalDate dataNascimento;

    private LocalDateTime ultimoAtendimento;
    private Long diasDesdeUltimoAtendimento;
    private List<ProcedimentoResumo> ultimosProcedimentos;
    private Long totalCancelamentos;
    private Long totalNaoCompareceu;
    private LocalDateTime clienteDesde;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProcedimentoResumo {
        private String nome;
        private LocalDateTime data;
    }
}
