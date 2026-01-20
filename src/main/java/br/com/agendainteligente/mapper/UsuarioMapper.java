package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.UsuarioDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UsuarioMapper {
    
    @Mapping(target = "senha", ignore = true) // Senha não é mapeada do DTO para Entity
    @Mapping(target = "perfil", expression = "java(usuario.getPerfil())") // Usa o método helper (retorna PerfilUsuario enum)
    @Mapping(target = "perfilId", expression = "java(usuario.getPerfilEntity() != null ? usuario.getPerfilEntity().getId() : null)")
    @Mapping(target = "perfilSistema", source = "perfilSistema")
    UsuarioDTO toDTO(Usuario usuario);
    
    @Mapping(target = "senha", ignore = true) // Senha será tratada no service
    @Mapping(target = "perfil", ignore = true) // Será setado manualmente no service
    @Mapping(target = "dataCriacao", ignore = true)
    @Mapping(target = "dataAtualizacao", ignore = true)
    Usuario toEntity(UsuarioDTO usuarioDTO);
    
    @Mapping(target = "senha", ignore = true)
    @Mapping(target = "perfil", ignore = true) // Será setado manualmente no service
    @Mapping(target = "dataCriacao", ignore = true)
    @Mapping(target = "dataAtualizacao", ignore = true)
    void updateEntityFromDTO(UsuarioDTO usuarioDTO, @MappingTarget Usuario usuario);
}

