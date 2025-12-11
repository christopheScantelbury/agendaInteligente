package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.dto.ServicoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ServicoMapper {
    
    ServicoDTO toDTO(Servico servico);
    
    Servico toEntity(ServicoDTO servicoDTO);
    
    void updateEntityFromDTO(ServicoDTO servicoDTO, @MappingTarget Servico servico);
}

