package br.com.agendainteligente.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HorarioDisponivelDTO {
    
    private Long id;
    
    @NotNull(message = "Atendente é obrigatório")
    private Long atendenteId;
    
    @NotNull(message = "Data/hora de início é obrigatória")
    private LocalDateTime dataHoraInicio;
    
    @NotNull(message = "Data/hora de fim é obrigatória")
    private LocalDateTime dataHoraFim;
    
    private Boolean disponivel;
    
    private String observacoes;
    
    private String atendenteNome;
}
