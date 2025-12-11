package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgendamentoCompletoDTO {
    
    private AgendamentoDTO agendamento;
    private PagamentoDTO pagamento;
    private NotaFiscalDTO notaFiscal;
}

