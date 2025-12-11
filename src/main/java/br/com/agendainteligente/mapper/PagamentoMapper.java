package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.dto.PagamentoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PagamentoMapper {
    
    @Mapping(target = "agendamentoId", source = "agendamento.id")
    PagamentoDTO toDTO(Pagamento pagamento);
    
    @Mapping(target = "agendamento", ignore = true)
    Pagamento toEntity(PagamentoDTO pagamentoDTO);
}

