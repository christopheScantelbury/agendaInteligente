package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.dto.AtendenteDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AtendenteMapper {
    
    @Mapping(target = "unidadeId", source = "unidade.id")
    @Mapping(target = "usuarioId", source = "usuario.id")
    @Mapping(target = "nomeUsuario", source = "usuario.nome")
    @Mapping(target = "nomeUnidade", source = "unidade.nome")
    AtendenteDTO toDTO(Atendente atendente);
    
    @Mapping(target = "unidade", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    Atendente toEntity(AtendenteDTO atendenteDTO);
}
