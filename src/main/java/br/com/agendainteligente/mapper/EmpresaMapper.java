package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.dto.EmpresaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EmpresaMapper {
    
    EmpresaDTO toDTO(Empresa empresa);
    
    Empresa toEntity(EmpresaDTO empresaDTO);
    
    void updateEntityFromDTO(EmpresaDTO empresaDTO, @MappingTarget Empresa empresa);
}
