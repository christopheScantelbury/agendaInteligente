package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.dto.ClienteDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ClienteMapper {
    
    @Mapping(target = "unidadeId", source = "unidade.id")
    ClienteDTO toDTO(Cliente cliente);
    
    @Mapping(target = "unidade", ignore = true) // Será setado manualmente no service
    Cliente toEntity(ClienteDTO clienteDTO);
    
    @Mapping(target = "unidade", ignore = true) // Será setado manualmente no service
    void updateEntityFromDTO(ClienteDTO clienteDTO, @MappingTarget Cliente cliente);
}

