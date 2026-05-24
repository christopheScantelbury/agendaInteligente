package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.CategoriaDespesa;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.CategoriaDespesaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.CategoriaDespesaRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoriaDespesaService {

    private final CategoriaDespesaRepository categoriaRepository;
    private final UsuarioRepository usuarioRepository;

    @Transactional(readOnly = true)
    public List<CategoriaDespesaDTO> listar() {
        Long adminUnicoId = adminUnicoIdLogado();
        return categoriaRepository.findVisiveis(adminUnicoId).stream()
                .filter(CategoriaDespesa::getAtivo)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoriaDespesaDTO criar(CategoriaDespesaDTO dto) {
        CategoriaDespesa categoria = CategoriaDespesa.builder()
                .nome(dto.getNome().trim())
                .cor(dto.getCor())
                .ativo(true)
                .adminUnicoId(adminUnicoIdLogado())
                .build();
        return toDTO(categoriaRepository.save(categoria));
    }

    @Transactional
    public CategoriaDespesaDTO atualizar(Long id, CategoriaDespesaDTO dto) {
        CategoriaDespesa categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        Long adminUnicoId = adminUnicoIdLogado();
        if (categoria.getAdminUnicoId() == null) {
            throw new BusinessException("Categorias padrão não podem ser editadas");
        }
        if (!categoria.getAdminUnicoId().equals(adminUnicoId)) {
            throw new BusinessException("Sem permissão para editar esta categoria");
        }
        categoria.setNome(dto.getNome().trim());
        categoria.setCor(dto.getCor());
        if (dto.getAtivo() != null) categoria.setAtivo(dto.getAtivo());
        return toDTO(categoriaRepository.save(categoria));
    }

    @Transactional
    public void inativar(Long id) {
        CategoriaDespesa categoria = categoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        Long adminUnicoId = adminUnicoIdLogado();
        if (categoria.getAdminUnicoId() == null) {
            throw new BusinessException("Categorias padrão não podem ser removidas");
        }
        if (!categoria.getAdminUnicoId().equals(adminUnicoId)) {
            throw new BusinessException("Sem permissão para remover esta categoria");
        }
        categoria.setAtivo(false);
        categoriaRepository.save(categoria);
    }

    private CategoriaDespesaDTO toDTO(CategoriaDespesa c) {
        return CategoriaDespesaDTO.builder()
                .id(c.getId())
                .nome(c.getNome())
                .cor(c.getCor())
                .ativo(c.getAtivo())
                .adminUnicoId(c.getAdminUnicoId())
                .padrao(c.getAdminUnicoId() == null)
                .build();
    }

    private Long adminUnicoIdLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) return usuario.getId();
        return usuario.getAdminUnicoId();
    }
}
