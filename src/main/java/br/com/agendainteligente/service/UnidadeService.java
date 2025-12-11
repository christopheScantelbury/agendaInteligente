package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Clinica;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.ClinicaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnidadeService {

    private final UnidadeRepository unidadeRepository;
    private final ClinicaRepository clinicaRepository;
    private final UnidadeMapper unidadeMapper;

    @Transactional(readOnly = true)
    public List<UnidadeDTO> listarTodos() {
        return unidadeRepository.findAll().stream()
                .map(unidade -> {
                    UnidadeDTO dto = unidadeMapper.toDTO(unidade);
                    if (unidade.getClinica() != null) {
                        dto.setClinicaId(unidade.getClinica().getId());
                        dto.setNomeClinica(unidade.getClinica().getNome());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "unidades", key = "'ativas'", unless = "#result.isEmpty()")
    public List<UnidadeDTO> listarAtivas() {
        return unidadeRepository.findByAtivoTrue().stream()
                .map(unidadeMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnidadeDTO buscarPorId(Long id) {
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        UnidadeDTO dto = unidadeMapper.toDTO(unidade);
        if (unidade.getClinica() != null) {
            dto.setClinicaId(unidade.getClinica().getId());
            dto.setNomeClinica(unidade.getClinica().getNome());
        }
        return dto;
    }

    @Transactional
    public UnidadeDTO criar(UnidadeDTO unidadeDTO) {
        if (unidadeDTO.getClinicaId() == null) {
            throw new ResourceNotFoundException("Clínica é obrigatória");
        }
        Clinica clinica = clinicaRepository.findById(unidadeDTO.getClinicaId())
                .orElseThrow(() -> new ResourceNotFoundException("Clínica não encontrada"));
        Unidade unidade = unidadeMapper.toEntity(unidadeDTO);
        unidade.setClinica(clinica);
        unidade = unidadeRepository.save(unidade);
        UnidadeDTO dto = unidadeMapper.toDTO(unidade);
        dto.setClinicaId(clinica.getId());
        dto.setNomeClinica(clinica.getNome());
        return dto;
    }

    @Transactional
    public UnidadeDTO atualizar(Long id, UnidadeDTO unidadeDTO) {
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        unidadeMapper.updateEntityFromDTO(unidadeDTO, unidade);
        unidade = unidadeRepository.save(unidade);
        return unidadeMapper.toDTO(unidade);
    }
}

