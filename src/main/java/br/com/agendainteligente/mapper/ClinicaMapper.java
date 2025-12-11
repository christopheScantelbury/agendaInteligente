package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Clinica;
import br.com.agendainteligente.dto.ClinicaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ClinicaMapper {
    
    ClinicaDTO toDTO(Clinica clinica);
    
    Clinica toEntity(ClinicaDTO clinicaDTO);
}

