package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.HorarioDisponivel;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface HorarioDisponivelMapper {
    
    @Mapping(source = "atendente.id", target = "atendenteId")
    @Mapping(target = "atendenteNome", ignore = true)
    HorarioDisponivelDTO toDTO(HorarioDisponivel horario);
    
    @Mapping(target = "atendente", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "dataCriacao", ignore = true)
    @Mapping(target = "dataAtualizacao", ignore = true)
    HorarioDisponivel toEntity(HorarioDisponivelDTO horarioDTO);
}

