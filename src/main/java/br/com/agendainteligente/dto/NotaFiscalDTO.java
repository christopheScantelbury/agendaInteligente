package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.StatusNotaFiscal;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotaFiscalDTO {
    
    private Long id;
    
    private Long agendamentoId;
    
    private String numeroNfse;
    
    private String codigoVerificacao;
    
    private String urlNfse;
    
    private StatusNotaFiscal status;
    
    private String mensagemErro;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dataEmissao;
}

