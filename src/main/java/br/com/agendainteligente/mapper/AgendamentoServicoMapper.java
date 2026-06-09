package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.dto.AgendamentoServicoDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring",
        uses = {ServicoMapper.class},
        unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface AgendamentoServicoMapper {

    @Mapping(target = "servicoId", source = "servico.id")
    @Mapping(target = "nomeServico", source = "servico.nome")
    @Mapping(target = "atendenteId", source = "atendente.id")
    @Mapping(target = "nomeAtendente", source = "atendente.usuario.nome")
    AgendamentoServicoDTO toDTO(AgendamentoServico agendamentoServico);

    @Mapping(target = "agendamento", ignore = true)
    @Mapping(target = "servico", ignore = true)
    @Mapping(target = "atendente", ignore = true)
    AgendamentoServico toEntity(AgendamentoServicoDTO dto);
}
