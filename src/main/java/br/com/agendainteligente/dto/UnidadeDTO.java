package br.com.agendainteligente.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnidadeDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String descricao;
    private String endereco;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    private String telefone;
    private String email;
    private Boolean ativo;

    private String razaoSocial;
    private String cnpj;
    private String inscricaoMunicipal;
    private String inscricaoEstadual;
    private String regimeTributario;
    private String complemento;

    @NotNull(message = "Horário de abertura é obrigatório")
    private java.time.LocalTime horarioAbertura;

    @NotNull(message = "Horário de fechamento é obrigatório")
    private java.time.LocalTime horarioFechamento;

    /** Garante que abertura < fechamento (validação cross-field). */
    @AssertTrue(message = "Horário de fechamento precisa ser posterior ao de abertura")
    public boolean isHorarioValido() {
        if (horarioAbertura == null || horarioFechamento == null) return true; // outras anots reclamam
        return horarioAbertura.isBefore(horarioFechamento);
    }

    private Long empresaId;

    // ── Integração NotaFácil ─────────────────────────────────────────────────
    private String municipioIbge;
    private String notafacilApiKey;
    private Boolean notafacilAtivo;

    // ── Sinal/Adiantamento (V76) ─────────────────────────────────────────────
    private Boolean cobraSinal;
    private java.math.BigDecimal percentualSinal;
}
