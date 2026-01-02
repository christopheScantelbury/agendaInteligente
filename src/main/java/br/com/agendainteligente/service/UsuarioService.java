package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.UsuarioDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UsuarioMapper;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioMapper usuarioMapper;

    @Transactional(readOnly = true)
    public List<UsuarioDTO> listarTodos() {
        return usuarioRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UsuarioDTO buscarPorId(Long id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO criar(UsuarioDTO usuarioDTO) {
        if (usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new BusinessException("Já existe um usuário com este email");
        }

        if (usuarioDTO.getSenha() == null || usuarioDTO.getSenha().trim().isEmpty()) {
            throw new BusinessException("Senha é obrigatória");
        }

        Usuario usuario = usuarioMapper.toEntity(usuarioDTO);
        usuario.setSenha(passwordEncoder.encode(usuarioDTO.getSenha()));

        // Validação: GERENTE deve ter unidade associada
        if (usuario.getPerfil() == Usuario.PerfilUsuario.GERENTE && usuarioDTO.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(usuarioDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            // Nota: A relação usuário-unidade pode ser implementada via tabela de
            // relacionamento
            // Por enquanto, apenas validamos que a unidade existe
        }

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário criado com sucesso. ID: {}, Email: {}", usuario.getId(), usuario.getEmail());
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO atualizar(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        // Verifica se email está sendo alterado e se já existe outro usuário com ele
        if (!usuario.getEmail().equals(usuarioDTO.getEmail())
                && usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new BusinessException("Já existe outro usuário cadastrado com este email");
        }

        usuarioMapper.updateEntityFromDTO(usuarioDTO, usuario);

        // Atualiza senha apenas se fornecida
        if (usuarioDTO.getSenha() != null && !usuarioDTO.getSenha().trim().isEmpty()) {
            usuario.setSenha(passwordEncoder.encode(usuarioDTO.getSenha()));
        }

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário atualizado com sucesso. ID: {}", usuario.getId());
        return toDTO(usuario);
    }

    @Transactional
    public void excluir(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new ResourceNotFoundException("Usuário não encontrado");
        }
        usuarioRepository.deleteById(id);
        log.info("Usuário excluído com sucesso. ID: {}", id);
    }

    private UsuarioDTO toDTO(Usuario usuario) {
        UsuarioDTO dto = usuarioMapper.toDTO(usuario);
        // Nota: Se houver relação direta usuário-clínica, buscar aqui
        return dto;
    }
}
