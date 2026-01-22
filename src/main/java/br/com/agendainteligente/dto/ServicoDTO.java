package br.com.agendainteligente.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServicoDTO {
    
    private Long id;
    
    @NotBlank(message = "Nome do serviço é obrigatório")
    private String nome;
    
    private String descricao;
    
    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal valor;
    
    @NotNull(message = "Duração é obrigatória")
    @Min(value = 1, message = "Duração deve ser no mínimo 1 minuto")
    private Integer duracaoMinutos;
    
    @NotNull(message = "Unidade é obrigatória")
    private Long unidadeId;
    
    private Boolean ativo;
}

