package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PlanoDTO {
    private Long id;
    private String nome;              // TRIAL | STARTER | PRO | BUSINESS
    private String nomePublico;
    private String descricao;
    private BigDecimal precoMensalBrl;
    private Integer limiteUnidades;            // null = ∞
    private Integer limiteProfissionais;       // null = ∞
    private Integer limiteAgendamentosMes;     // null = ∞
    private Integer limiteNfseMes;
    private BigDecimal precoExcedenteNfseBrl;
    private Integer duracaoTrialDias;
    private Integer ordem;
    private Boolean ativo;
}
