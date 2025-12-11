package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", 
        uses = {ClienteMapper.class, UnidadeMapper.class, AtendenteMapper.class, AgendamentoServicoMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AgendamentoMapper {
    
    @Mapping(target = "clienteId", source = "cliente.id")
    @Mapping(target = "unidadeId", source = "unidade.id")
    @Mapping(target = "atendenteId", source = "atendente.id")
    @Mapping(target = "servicos", source = "servicos")
    AgendamentoDTO toDTO(Agendamento agendamento);
    
    @Mapping(target = "cliente", ignore = true)
    @Mapping(target = "unidade", ignore = true)
    @Mapping(target = "atendente", ignore = true)
    @Mapping(target = "servicos", ignore = true)
    @Mapping(target = "pagamento", ignore = true)
    @Mapping(target = "notaFiscal", ignore = true)
    Agendamento toEntity(AgendamentoDTO agendamentoDTO);
}

