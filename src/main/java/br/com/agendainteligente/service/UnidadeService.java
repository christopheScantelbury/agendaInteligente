package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    private final UnidadeMapper unidadeMapper;
    private final ImageCompressionService imageCompressionService;

    @Transactional(readOnly = true)
    public List<UnidadeDTO> listarTodos() {
        return unidadeRepository.findAll().stream()
                .map(unidadeMapper::toDTO)
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
        return unidadeMapper.toDTO(unidade);
    }

    @Transactional
    public UnidadeDTO criar(UnidadeDTO unidadeDTO) {
        // Comprime a imagem se fornecida
        if (unidadeDTO.getLogo() != null && !unidadeDTO.getLogo().trim().isEmpty()) {
            String compressedLogo = imageCompressionService.compressImage(unidadeDTO.getLogo());
            unidadeDTO.setLogo(compressedLogo);
        }
        
        // Valida e normaliza a cor do app
        if (unidadeDTO.getCorApp() != null && !unidadeDTO.getCorApp().trim().isEmpty()) {
            unidadeDTO.setCorApp(validateAndNormalizeColor(unidadeDTO.getCorApp()));
        }
        
        Unidade unidade = unidadeMapper.toEntity(unidadeDTO);
        unidade = unidadeRepository.save(unidade);
        return unidadeMapper.toDTO(unidade);
    }

    @Transactional
    public UnidadeDTO atualizar(Long id, UnidadeDTO unidadeDTO) {
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        
        // Comprime a imagem se fornecida
        if (unidadeDTO.getLogo() != null && !unidadeDTO.getLogo().trim().isEmpty()) {
            String compressedLogo = imageCompressionService.compressImage(unidadeDTO.getLogo());
            unidadeDTO.setLogo(compressedLogo);
        }
        
        // Valida e normaliza a cor do app
        if (unidadeDTO.getCorApp() != null && !unidadeDTO.getCorApp().trim().isEmpty()) {
            unidadeDTO.setCorApp(validateAndNormalizeColor(unidadeDTO.getCorApp()));
        }
        
        unidadeMapper.updateEntityFromDTO(unidadeDTO, unidade);
        unidade = unidadeRepository.save(unidade);
        return unidadeMapper.toDTO(unidade);
    }
    
    /**
     * Valida e normaliza a cor hexadecimal
     * @param color Cor em formato hexadecimal (com ou sem #)
     * @return Cor normalizada com #
     */
    private String validateAndNormalizeColor(String color) {
        if (color == null || color.trim().isEmpty()) {
            return null;
        }
        
        String normalized = color.trim().toUpperCase();
        
        // Remove # se existir
        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1);
        }
        
        // Valida formato hexadecimal (6 caracteres)
        if (!normalized.matches("^[0-9A-F]{6}$")) {
            log.warn("Cor inválida: {}. Usando cor padrão.", color);
            return "#2563EB"; // Cor padrão (azul)
        }
        
        return "#" + normalized;
    }
}
