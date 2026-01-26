package br.com.agendainteligente.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO para configuração de recorrência de agendamentos
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecorrenciaDTO {

    /**
     * Indica se o agendamento é recorrente
     */
    @NotNull(message = "É necessário informar se o agendamento é recorrente")
    private Boolean recorrente;

    /**
     * Tipo de recorrência:
     * - DIARIA: Todos os dias
     * - SEMANAL: Dias específicos da semana
     * - MENSAL: Mesmo dia do mês
     */
    private TipoRecorrencia tipoRecorrencia;

    /**
     * Dias da semana selecionados (para recorrência semanal)
     * 1 = Segunda, 2 = Terça, ..., 7 = Domingo
     */
    private List<Integer> diasDaSemana; // 1-7 (DayOfWeek)

    /**
     * Tipo de término:
     * - INFINITA: Sem data de término
     * - DATA: Até uma data específica
     * - OCORRENCIAS: Após N ocorrências
     */
    private TipoTermino tipoTermino;

    /**
     * Data de término (para tipoTermino = DATA)
     */
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dataTermino;

    /**
     * Número de ocorrências (para tipoTermino = OCORRENCIAS)
     */
    @Min(value = 1, message = "Número de ocorrências deve ser pelo menos 1")
    private Integer numeroOcorrencias;

    /**
     * Intervalo entre ocorrências (em semanas para semanal, dias para diária)
     * Exemplo: 2 = a cada 2 semanas, 1 = toda semana
     */
    @Builder.Default
    @Min(value = 1, message = "Intervalo deve ser pelo menos 1")
    private Integer intervalo = 1;

    public enum TipoRecorrencia {
        DIARIA,      // Todos os dias
        SEMANAL,     // Dias específicos da semana
        MENSAL       // Mesmo dia do mês
    }

    public enum TipoTermino {
        INFINITA,    // Sem data de término
        DATA,        // Até uma data específica
        OCORRENCIAS  // Após N ocorrências
    }

    /**
     * Converte lista de inteiros para DayOfWeek
     */
    public List<DayOfWeek> getDiasDaSemanaAsDayOfWeek() {
        if (diasDaSemana == null || diasDaSemana.isEmpty()) {
            return List.of();
        }
        return diasDaSemana.stream()
                .map(day -> {
                    // Ajusta: 1 = Segunda (MONDAY), 7 = Domingo (SUNDAY)
                    if (day == 7) {
                        return DayOfWeek.SUNDAY;
                    }
                    return DayOfWeek.of(day);
                })
                .toList();
    }
}
