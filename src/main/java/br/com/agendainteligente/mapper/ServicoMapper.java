package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.dto.ServicoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ServicoMapper {
    
    @Mapping(target = "unidadeId", source = "unidade.id")
    ServicoDTO toDTO(Servico servico);
    
    @Mapping(target = "unidade", ignore = true) // Será setado manualmente no service
    Servico toEntity(ServicoDTO servicoDTO);
    
    @Mapping(target = "unidade", ignore = true) // Será setado manualmente no service
    void updateEntityFromDTO(ServicoDTO servicoDTO, @MappingTarget Servico servico);
}

