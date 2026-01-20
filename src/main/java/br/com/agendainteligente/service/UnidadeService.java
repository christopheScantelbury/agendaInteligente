package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnidadeService {

    private final UnidadeRepository unidadeRepository;
    private final UnidadeMapper unidadeMapper;
    private final EmpresaRepository empresaRepository;

    private static final Pattern ONLY_DIGITS = Pattern.compile("\\D");

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
        // Remover máscaras antes de validar e salvar
        normalizeUnidadeDTO(unidadeDTO);

        // Validar empresa
        if (unidadeDTO.getEmpresaId() == null) {
            throw new BusinessException("Empresa é obrigatória para criar uma unidade");
        }
        
        Empresa empresa = empresaRepository.findById(unidadeDTO.getEmpresaId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        
        Unidade unidade = unidadeMapper.toEntity(unidadeDTO);
        unidade.setEmpresa(empresa);
        unidade = unidadeRepository.save(unidade);
        log.info("Unidade criada. ID: {}, Nome: {}, Empresa: {}", unidade.getId(), unidade.getNome(), empresa.getNome());
        return unidadeMapper.toDTO(unidade);
    }

    @Transactional
    public UnidadeDTO atualizar(Long id, UnidadeDTO unidadeDTO) {
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));

        // Remover máscaras antes de validar e salvar
        normalizeUnidadeDTO(unidadeDTO);
        
        // Atualizar empresa se fornecido
        if (unidadeDTO.getEmpresaId() != null && !unidadeDTO.getEmpresaId().equals(unidade.getEmpresa().getId())) {
            Empresa empresa = empresaRepository.findById(unidadeDTO.getEmpresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
            unidade.setEmpresa(empresa);
        }
        
        unidadeMapper.updateEntityFromDTO(unidadeDTO, unidade);
        unidade = unidadeRepository.save(unidade);
        log.info("Unidade atualizada. ID: {}", id);
        return unidadeMapper.toDTO(unidade);
    }

    /**
     * Remove máscaras de campos como CEP, telefone e número.
     */
    private void normalizeUnidadeDTO(UnidadeDTO unidadeDTO) {
        if (unidadeDTO.getCep() != null && !unidadeDTO.getCep().trim().isEmpty()) {
            String cepNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getCep()).replaceAll("");
            // Limitar a 8 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setCep(cepNormalizado.length() > 8 ? cepNormalizado.substring(0, 8) : cepNormalizado);
        }
        if (unidadeDTO.getTelefone() != null && !unidadeDTO.getTelefone().trim().isEmpty()) {
            String telefoneNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getTelefone()).replaceAll("");
            // Limitar a 20 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setTelefone(telefoneNormalizado.length() > 20 ? telefoneNormalizado.substring(0, 20) : telefoneNormalizado);
        }
        if (unidadeDTO.getNumero() != null && !unidadeDTO.getNumero().trim().isEmpty()) {
            String numeroNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getNumero()).replaceAll("");
            // Limitar a 10 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setNumero(numeroNormalizado.length() > 10 ? numeroNormalizado.substring(0, 10) : numeroNormalizado);
        }
        if (unidadeDTO.getCnpj() != null && !unidadeDTO.getCnpj().trim().isEmpty()) {
            String cnpjNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getCnpj()).replaceAll("");
            // Limitar a 14 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setCnpj(cnpjNormalizado.length() > 14 ? cnpjNormalizado.substring(0, 14) : cnpjNormalizado);
        }
    }
}
