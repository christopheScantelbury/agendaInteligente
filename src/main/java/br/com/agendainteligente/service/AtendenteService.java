package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.AtendenteDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.AtendenteMapper;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AtendenteService {

    private final AtendenteRepository atendenteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final AtendenteMapper atendenteMapper;

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarTodos() {
        return atendenteRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarAtivos() {
        return atendenteRepository.findByAtivoTrue().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarPorUnidade(Long unidadeId) {
        return atendenteRepository.findByUnidadeIdAndAtivoTrue(unidadeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AtendenteDTO buscarPorId(Long id) {
        Atendente atendente = atendenteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        return toDTO(atendente);
    }

    @Transactional
    public AtendenteDTO criar(AtendenteDTO atendenteDTO) {
        Unidade unidade = unidadeRepository.findById(atendenteDTO.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        
        Usuario usuario = usuarioRepository.findById(atendenteDTO.getUsuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        
        if (atendenteRepository.findByUsuarioId(usuario.getId()).isPresent()) {
            throw new BusinessException("Este usuário já está vinculado a um atendente");
        }
        
        Atendente atendente = atendenteMapper.toEntity(atendenteDTO);
        atendente.setUnidade(unidade);
        atendente.setUsuario(usuario);
        atendente = atendenteRepository.save(atendente);
        return toDTO(atendente);
    }

    private AtendenteDTO toDTO(Atendente atendente) {
        AtendenteDTO dto = atendenteMapper.toDTO(atendente);
        dto.setNomeUsuario(atendente.getUsuario().getNome());
        dto.setNomeUnidade(atendente.getUnidade().getNome());
        return dto;
    }
}

