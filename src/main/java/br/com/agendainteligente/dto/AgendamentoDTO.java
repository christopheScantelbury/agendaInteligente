package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.StatusAgendamento;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoDTO {
    
    private Long id;
    
    @NotNull(message = "Cliente é obrigatório")
    private Long clienteId;
    
    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId;
    
    @NotNull(message = "Atendente é obrigatório")
    private Long atendenteId;
    
    @NotNull(message = "Data/hora de início é obrigatória")
    @Future(message = "Data/hora deve ser futura")
    private LocalDateTime dataHoraInicio;
    
    private LocalDateTime dataHoraFim;
    
    private String observacoes;
    
    private BigDecimal valorTotal;
    
    private StatusAgendamento status;
    
    private BigDecimal valorFinal; // Valor informado ao finalizar
    
    private ClienteDTO cliente;
    private UnidadeDTO unidade;
    private AtendenteDTO atendente;
    private java.util.List<AgendamentoServicoDTO> servicos;
}

