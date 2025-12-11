package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.dto.ClienteDTO;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ClienteMapper {
    
    ClienteDTO toDTO(Cliente cliente);
    
    Cliente toEntity(ClienteDTO clienteDTO);
    
    void updateEntityFromDTO(ClienteDTO clienteDTO, @MappingTarget Cliente cliente);
}

