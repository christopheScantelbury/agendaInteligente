package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PerfilMapper;
import br.com.agendainteligente.repository.PerfilRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PerfilService {

    private final PerfilRepository perfilRepository;
    private final PerfilMapper perfilMapper;

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarTodos() {
        return perfilRepository.findAll().stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarAtivos() {
        return perfilRepository.findByAtivoTrue().stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarCustomizados() {
        return perfilRepository.findBySistemaFalse().stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PerfilDTO buscarPorId(Long id) {
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        return perfilMapper.toDTO(perfil);
    }

    @Transactional(readOnly = true)
    public PerfilDTO buscarPorNome(String nome) {
        Perfil perfil = perfilRepository.findByNome(nome)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        return perfilMapper.toDTO(perfil);
    }

    @Transactional
    public PerfilDTO criar(PerfilDTO perfilDTO) {
        // Validar nome único
        if (perfilRepository.existsByNome(perfilDTO.getNome())) {
            throw new BusinessException("Já existe um perfil com este nome");
        }

        // Perfis customizados não podem ser do sistema
        perfilDTO.setSistema(false);

        Perfil perfil = perfilMapper.toEntity(perfilDTO);
        perfil = perfilRepository.save(perfil);
        log.info("Perfil criado. ID: {}, Nome: {}", perfil.getId(), perfil.getNome());
        return perfilMapper.toDTO(perfil);
    }

    @Transactional
    public PerfilDTO atualizar(Long id, PerfilDTO perfilDTO) {
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));

        // Não permitir editar perfis do sistema
        if (perfil.getSistema()) {
            throw new BusinessException("Não é possível editar perfis do sistema");
        }

        // Validar nome único se mudou
        if (!perfil.getNome().equals(perfilDTO.getNome())) {
            if (perfilRepository.existsByNome(perfilDTO.getNome())) {
                throw new BusinessException("Já existe um perfil com este nome");
            }
        }

        // Garantir que não vire perfil do sistema
        perfilDTO.setSistema(false);

        perfilMapper.updateEntityFromDTO(perfilDTO, perfil);
        perfil = perfilRepository.save(perfil);
        log.info("Perfil atualizado. ID: {}", id);
        return perfilMapper.toDTO(perfil);
    }

    @Transactional
    public void excluir(Long id) {
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));

        // Não permitir excluir perfis do sistema
        if (perfil.getSistema()) {
            throw new BusinessException("Não é possível excluir perfis do sistema");
        }

        // Verificar se tem usuários vinculados
        if (perfil.getUsuarios() != null && !perfil.getUsuarios().isEmpty()) {
            throw new BusinessException("Não é possível excluir perfil com usuários vinculados");
        }

        perfilRepository.delete(perfil);
        log.info("Perfil excluído. ID: {}", id);
    }
}
