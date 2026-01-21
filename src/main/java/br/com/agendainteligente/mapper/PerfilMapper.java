package br.com.agendainteligente.mapper;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.dto.PerfilDTO;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

import java.util.List;
import java.util.Map;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface PerfilMapper {
    
    @Mapping(target = "permissoesMenu", expression = "java(parsePermissoesMenu(perfil.getPermissoesMenu()))")
    @Mapping(target = "permissoesGranulares", expression = "java(parsePermissoesGranulares(perfil.getPermissoesGranulares()))")
    PerfilDTO toDTO(Perfil perfil);
    
    @Mapping(target = "permissoesMenu", expression = "java(serializePermissoesMenu(perfilDTO.getPermissoesMenu()))")
    @Mapping(target = "permissoesGranulares", expression = "java(serializePermissoesGranulares(perfilDTO.getPermissoesGranulares()))")
    Perfil toEntity(PerfilDTO perfilDTO);
    
    @Mapping(target = "permissoesMenu", expression = "java(serializePermissoesMenu(perfilDTO.getPermissoesMenu()))")
    @Mapping(target = "permissoesGranulares", expression = "java(serializePermissoesGranulares(perfilDTO.getPermissoesGranulares()))")
    void updateEntityFromDTO(PerfilDTO perfilDTO, @MappingTarget Perfil perfil);
    
    default List<String> parsePermissoesMenu(String json) {
        if (json == null || json.trim().isEmpty()) {
            return List.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
    
    default String serializePermissoesMenu(List<String> permissoes) {
        if (permissoes == null || permissoes.isEmpty()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(permissoes);
        } catch (Exception e) {
            return null;
        }
    }
    
    default Map<String, String> parsePermissoesGranulares(String json) {
        if (json == null || json.trim().isEmpty()) {
            return Map.of();
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.readValue(json, new TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
    
    default String serializePermissoesGranulares(Map<String, String> permissoes) {
        if (permissoes == null || permissoes.isEmpty()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(permissoes);
        } catch (Exception e) {
            return null;
        }
    }
}
