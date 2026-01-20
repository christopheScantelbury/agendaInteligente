package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.AtendenteDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.AtendenteMapper;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AtendenteService {

    private final AtendenteRepository atendenteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicoRepository servicoRepository;
    private final AtendenteMapper atendenteMapper;
    
    private static final Pattern ONLY_DIGITS = Pattern.compile("\\D");

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
    public List<AtendenteDTO> listarPorUnidadeEServicos(Long unidadeId, List<Long> servicosIds) {
        log.debug("Listando atendentes da unidade {} que prestam os serviços {}", unidadeId, servicosIds);
        
        List<Atendente> atendentes = atendenteRepository.findByUnidadeIdAndAtivoTrue(unidadeId);
        
        if (servicosIds == null || servicosIds.isEmpty()) {
            return atendentes.stream()
                    .map(this::toDTO)
                    .collect(Collectors.toList());
        }
        
        // Filtrar atendentes que prestam TODOS os serviços selecionados
        List<Atendente> atendentesFiltrados = atendentes.stream()
                .filter(atendente -> {
                    if (atendente.getServicos() == null || atendente.getServicos().isEmpty()) {
                        return false;
                    }
                    // Verifica se o atendente presta todos os serviços selecionados
                    List<Long> servicosAtendente = atendente.getServicos().stream()
                            .filter(Servico::getAtivo)
                            .map(Servico::getId)
                            .collect(Collectors.toList());
                    return servicosAtendente.containsAll(servicosIds);
                })
                .collect(Collectors.toList());
        
        return atendentesFiltrados.stream()
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
        // Remover máscaras antes de validar e salvar
        normalizeAtendenteDTO(atendenteDTO);
        
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
        
        // Associa serviços se fornecidos
        if (atendenteDTO.getServicosIds() != null && !atendenteDTO.getServicosIds().isEmpty()) {
            List<Servico> servicos = servicoRepository.findAllById(atendenteDTO.getServicosIds());
            if (servicos.size() != atendenteDTO.getServicosIds().size()) {
                throw new ResourceNotFoundException("Um ou mais serviços não foram encontrados");
            }
            atendente.setServicos(servicos);
        }
        
        atendente = atendenteRepository.save(atendente);
        log.info("Atendente criado com sucesso. ID: {}", atendente.getId());
        return toDTO(atendente);
    }

    @Transactional
    public AtendenteDTO atualizar(Long id, AtendenteDTO atendenteDTO) {
        // Remover máscaras antes de validar e salvar
        normalizeAtendenteDTO(atendenteDTO);
        
        Atendente atendente = atendenteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        
        Unidade unidade = unidadeRepository.findById(atendenteDTO.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        
        // Verifica se está mudando o usuário e se o novo usuário já está vinculado
        if (!atendente.getUsuario().getId().equals(atendenteDTO.getUsuarioId())) {
            if (atendenteRepository.findByUsuarioId(atendenteDTO.getUsuarioId()).isPresent()) {
                throw new BusinessException("Este usuário já está vinculado a outro atendente");
            }
            Usuario usuario = usuarioRepository.findById(atendenteDTO.getUsuarioId())
                    .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
            atendente.setUsuario(usuario);
        }
        
        atendente.setUnidade(unidade);
        atendente.setCpf(atendenteDTO.getCpf());
        atendente.setTelefone(atendenteDTO.getTelefone());
        if (atendenteDTO.getAtivo() != null) {
            atendente.setAtivo(atendenteDTO.getAtivo());
        }
        
        // Atualiza serviços se fornecidos
        if (atendenteDTO.getServicosIds() != null) {
            List<Servico> servicos = servicoRepository.findAllById(atendenteDTO.getServicosIds());
            if (servicos.size() != atendenteDTO.getServicosIds().size()) {
                throw new ResourceNotFoundException("Um ou mais serviços não foram encontrados");
            }
            atendente.setServicos(servicos);
        }
        
        atendente = atendenteRepository.save(atendente);
        log.info("Atendente atualizado com sucesso. ID: {}", atendente.getId());
        return toDTO(atendente);
    }

    @Transactional
    public void excluir(Long id) {
        if (!atendenteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Atendente não encontrado");
        }
        atendenteRepository.deleteById(id);
        log.info("Atendente excluído com sucesso. ID: {}", id);
    }

    private AtendenteDTO toDTO(Atendente atendente) {
        AtendenteDTO dto = atendenteMapper.toDTO(atendente);
        dto.setNomeUsuario(atendente.getUsuario().getNome());
        dto.setNomeUnidade(atendente.getUnidade().getNome());
        if (atendente.getServicos() != null) {
            dto.setServicosIds(atendente.getServicos().stream()
                    .map(Servico::getId)
                    .collect(Collectors.toList()));
        }
        return dto;
    }

    /**
     * Remove máscaras de campos como CPF e telefone.
     */
    private void normalizeAtendenteDTO(AtendenteDTO atendenteDTO) {
        if (atendenteDTO.getCpf() != null && !atendenteDTO.getCpf().trim().isEmpty()) {
            String cpfNormalizado = ONLY_DIGITS.matcher(atendenteDTO.getCpf()).replaceAll("");
            // Limitar a 14 caracteres (tamanho máximo do campo no banco)
            atendenteDTO.setCpf(cpfNormalizado.length() > 14 ? cpfNormalizado.substring(0, 14) : cpfNormalizado);
        }
        if (atendenteDTO.getTelefone() != null && !atendenteDTO.getTelefone().trim().isEmpty()) {
            String telefoneNormalizado = ONLY_DIGITS.matcher(atendenteDTO.getTelefone()).replaceAll("");
            // Limitar a 20 caracteres (tamanho máximo do campo no banco)
            atendenteDTO.setTelefone(telefoneNormalizado.length() > 20 ? telefoneNormalizado.substring(0, 20) : telefoneNormalizado);
        }
    }
}

