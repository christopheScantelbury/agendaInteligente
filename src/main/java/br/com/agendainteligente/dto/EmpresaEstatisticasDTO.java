package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * #158: KPIs resumidos da empresa exibidos no modal "Editar Empresa".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpresaEstatisticasDTO {

    private long unidades;
    private long profissionais;
    private long agendamentosMesAtual;
    private long clientesAtivos;

    // ── NFS-e do mês vs cota do plano ──
    private long nfseMesAtual;
    /** Cota mensal do plano. NULL = empresa sem plano. */
    private Integer nfseLimiteMes;

    // ── Plano ──
    private String planoNome;
    private LocalDate planoVencimento;
}
