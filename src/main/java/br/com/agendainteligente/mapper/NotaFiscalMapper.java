package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.NotaFiscal;
import br.com.agendainteligente.dto.NotaFiscalDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface NotaFiscalMapper {
    
    @Mapping(target = "agendamentoId", source = "agendamento.id")
    NotaFiscalDTO toDTO(NotaFiscal notaFiscal);
    
    @Mapping(target = "agendamento", ignore = true)
    NotaFiscal toEntity(NotaFiscalDTO notaFiscalDTO);
}

