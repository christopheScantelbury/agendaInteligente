package br.com.agendainteligente.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Payload do guest checkout — cria cliente (sem senha) + agendamento atomicamente.
 * #86 (S6-2).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendarComoVisitanteDTO {

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    /** CPF/CNPJ opcional. Se ausente, cliente pode preencher depois ao "salvar conta". */
    private String cpfCnpj;

    @NotBlank(message = "Email é obrigatório")
    private String email;

    @NotBlank(message = "Telefone é obrigatório")
    private String telefone;

    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId;

    @NotNull(message = "Atendente é obrigatório")
    private Long atendenteId;

    @NotNull(message = "Data/hora é obrigatória")
    private LocalDateTime dataHoraInicio;

    /** Forma de pagamento preferida pelo cliente (PIX | CARTAO | NO_LOCAL etc.). */
    private String formaPagamentoPreferida;

    @Valid
    private List<AgendamentoServicoDTO> servicos;
}
