package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.entity.Reclamacao;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(min = 5, max = 4000, message = "Mensagem deve ter entre 5 e 4000 caracteres")
    private String mensagem;

    private Long unidadeId;

    @Size(max = 150, message = "Nome não pode ultrapassar 150 caracteres")
    private String nomeReclamante;

    @Email(message = "Email inválido")
    @Size(max = 255)
    private String emailReclamante;

    @Size(max = 20)
    private String telefoneReclamante;

    private Reclamacao.Categoria categoria;

    private Reclamacao.Status status;

    private Boolean lida;

    private LocalDateTime dataCriacao;

    private LocalDateTime dataLeitura;

    private String resposta;

    private LocalDateTime dataResposta;

    private String respondidaPor;
}
