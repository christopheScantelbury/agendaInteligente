package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.UnidadeDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UnidadeMapper {
    
    @Mapping(target = "empresaId", source = "empresa.id")
    UnidadeDTO toDTO(Unidade unidade);
    
    @Mapping(target = "empresa", ignore = true) // Será setado manualmente no service
    Unidade toEntity(UnidadeDTO unidadeDTO);
    
    @Mapping(target = "empresa", ignore = true) // Será setado manualmente no service
    void updateEntityFromDTO(UnidadeDTO unidadeDTO, @MappingTarget Unidade unidade);
}

