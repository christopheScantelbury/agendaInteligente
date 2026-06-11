package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.dto.EmpresaDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface EmpresaMapper {

    @Mapping(target = "planoId", source = "plano.id")
    @Mapping(target = "planoNome", source = "plano.nomePublico")
    @Mapping(target = "planoPreco", source = "plano.precoMensalBrl")
    EmpresaDTO toDTO(Empresa empresa);

    // Plano NUNCA atualizado por aqui — só pelo endpoint dedicado POST /{id}/plano (#158).
    @Mapping(target = "plano", ignore = true)
    @Mapping(target = "planoInicio", ignore = true)
    @Mapping(target = "planoExpiracao", ignore = true)
    Empresa toEntity(EmpresaDTO empresaDTO);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "plano", ignore = true)
    @Mapping(target = "planoInicio", ignore = true)
    @Mapping(target = "planoExpiracao", ignore = true)
    void updateEntityFromDTO(EmpresaDTO empresaDTO, @MappingTarget Empresa empresa);
}
