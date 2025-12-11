package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Clinica;
import br.com.agendainteligente.dto.ClinicaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ClinicaMapper;
import br.com.agendainteligente.repository.ClinicaRepository;
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
public class ClinicaService {

    private final ClinicaRepository clinicaRepository;
    private final ClinicaMapper clinicaMapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "clinicas", unless = "#result.isEmpty()")
    public List<ClinicaDTO> listarTodas() {
        return clinicaRepository.findAll().stream()
                .map(clinicaMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clinicas", key = "#id")
    public ClinicaDTO buscarPorId(Long id) {
        Clinica clinica = clinicaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Clínica não encontrada"));
        return clinicaMapper.toDTO(clinica);
    }

    @Transactional
    @CacheEvict(value = "clinicas", allEntries = true)
    public ClinicaDTO criar(ClinicaDTO clinicaDTO) {
        if (clinicaRepository.existsByCnpj(clinicaDTO.getCnpj())) {
            throw new BusinessException("Já existe uma clínica cadastrada com este CNPJ");
        }
        Clinica clinica = clinicaMapper.toEntity(clinicaDTO);
        clinica = clinicaRepository.save(clinica);
        return clinicaMapper.toDTO(clinica);
    }
}

