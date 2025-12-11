package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.StatusPagamento;
import br.com.agendainteligente.domain.enums.TipoPagamento;
import com.fasterxml.jackson.annotation.JsonFormat;
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
public class PagamentoDTO {
    
    private Long id;
    
    @NotNull(message = "Agendamento é obrigatório")
    private Long agendamentoId;
    
    @NotNull(message = "Tipo de pagamento é obrigatório")
    private TipoPagamento tipoPagamento;
    
    private StatusPagamento status;
    
    private BigDecimal valor;
    
    private String idTransacaoGateway;
    
    private String urlPagamento;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dataPagamento;
}

