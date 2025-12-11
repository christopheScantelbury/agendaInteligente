package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.UnidadeDTO;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UnidadeMapper {
    
    UnidadeDTO toDTO(Unidade unidade);
    
    Unidade toEntity(UnidadeDTO unidadeDTO);
    
    void updateEntityFromDTO(UnidadeDTO unidadeDTO, @MappingTarget Unidade unidade);
}

