package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Reclamacao;
import br.com.agendainteligente.dto.ReclamacaoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ReclamacaoMapper {
    
    ReclamacaoDTO toDTO(Reclamacao reclamacao);
    
    Reclamacao toEntity(ReclamacaoDTO reclamacaoDTO);
}
