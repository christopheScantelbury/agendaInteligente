package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Reclamacao;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.ReclamacaoDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ReclamacaoMapper;
import br.com.agendainteligente.repository.ReclamacaoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamacaoService {

    private final ReclamacaoRepository reclamacaoRepository;
    private final ReclamacaoMapper reclamacaoMapper;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;

    @Transactional
    public ReclamacaoDTO criar(ReclamacaoDTO reclamacaoDTO) {
        Reclamacao reclamacao = reclamacaoMapper.toEntity(reclamacaoDTO);
        reclamacao.setLida(false);
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação anônima criada. ID: {}", reclamacao.getId());
        return reclamacaoMapper.toDTO(reclamacao);
    }

    private Set<Long> obterUnidadesIdsPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Set.of();
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuario == null) {
            return Set.of();
        }
        switch (usuario.getPerfil()) {
            case ADMIN:
                return unidadeRepository.findAll().stream().map(Unidade::getId).collect(Collectors.toSet());
            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    return Set.of();
                }
                Set<Long> empresaIds = usuario.getUnidades().stream()
                        .map(u -> {
                            if (u.getEmpresa() == null) {
                                Unidade uc = unidadeRepository.findById(u.getId()).orElse(null);
                                return uc != null && uc.getEmpresa() != null ? uc.getEmpresa().getId() : null;
                            }
                            return u.getEmpresa().getId();
                        })
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                if (empresaIds.isEmpty()) {
                    return Set.of();
                }
                return unidadeRepository.findAll().stream()
                        .filter(u -> u.getEmpresa() != null && empresaIds.contains(u.getEmpresa().getId()))
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
            case PROFISSIONAL:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    return Set.of();
                }
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default:
                return Set.of();
        }
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarTodas() {
        Set<Long> unidadesIds = obterUnidadesIdsPermitidas();
        if (unidadesIds.isEmpty()) {
            return List.of();
        }
        return reclamacaoRepository.findAll().stream()
                .filter(r -> r.getUnidadeId() != null && unidadesIds.contains(r.getUnidadeId()))
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarNaoLidas() {
        Set<Long> unidadesIds = obterUnidadesIdsPermitidas();
        if (unidadesIds.isEmpty()) {
            return List.of();
        }
        return reclamacaoRepository.findByLidaFalseOrderByDataCriacaoDesc().stream()
                .filter(r -> r.getUnidadeId() != null && unidadesIds.contains(r.getUnidadeId()))
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarPorUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            return List.of();
        }
        return reclamacaoRepository.findByUnidadeIdOrderByDataCriacaoDesc(unidadeId).stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarNaoLidasPorUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            return List.of();
        }
        return reclamacaoRepository.findByUnidadeIdAndLidaFalseOrderByDataCriacaoDesc(unidadeId).stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Long contarNaoLidas() {
        Set<Long> unidadesIds = obterUnidadesIdsPermitidas();
        if (unidadesIds.isEmpty()) {
            return 0L;
        }
        return reclamacaoRepository.findAll().stream()
                .filter(r -> !r.getLida() && r.getUnidadeId() != null && unidadesIds.contains(r.getUnidadeId()))
                .count();
    }

    @Transactional(readOnly = true)
    public Long contarNaoLidasPorUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            return 0L;
        }
        return reclamacaoRepository.countByUnidadeIdAndLidaFalse(unidadeId);
    }

    @Transactional
    public ReclamacaoDTO marcarComoLida(Long id) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reclamação não encontrada"));
        if (reclamacao.getUnidadeId() == null || !obterUnidadesIdsPermitidas().contains(reclamacao.getUnidadeId())) {
            throw new ResourceNotFoundException("Reclamação não encontrada");
        }
        reclamacao.setLida(true);
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação marcada como lida. ID: {}", id);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    @Transactional(readOnly = true)
    public ReclamacaoDTO buscarPorId(Long id) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reclamação não encontrada"));
        if (reclamacao.getUnidadeId() == null || !obterUnidadesIdsPermitidas().contains(reclamacao.getUnidadeId())) {
            throw new ResourceNotFoundException("Reclamação não encontrada");
        }
        return reclamacaoMapper.toDTO(reclamacao);
    }
}
