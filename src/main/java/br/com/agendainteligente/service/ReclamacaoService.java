package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Reclamacao;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.ReclamacaoDTO;
import br.com.agendainteligente.exception.BusinessException;
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

import java.time.LocalDateTime;
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
        // Defaults
        if (reclamacao.getCategoria() == null) reclamacao.setCategoria(Reclamacao.Categoria.RECLAMACAO);
        if (reclamacao.getStatus() == null) reclamacao.setStatus(Reclamacao.Status.RECEBIDA);
        reclamacao.setLida(false);
        // Normaliza contato (vazio → null)
        if (reclamacao.getNomeReclamante() != null && reclamacao.getNomeReclamante().isBlank())
            reclamacao.setNomeReclamante(null);
        if (reclamacao.getEmailReclamante() != null && reclamacao.getEmailReclamante().isBlank())
            reclamacao.setEmailReclamante(null);
        if (reclamacao.getTelefoneReclamante() != null && reclamacao.getTelefoneReclamante().isBlank())
            reclamacao.setTelefoneReclamante(null);
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação criada. ID: {} categoria: {} unidadeId: {} comContato: {}",
                reclamacao.getId(), reclamacao.getCategoria(), reclamacao.getUnidadeId(),
                reclamacao.getEmailReclamante() != null || reclamacao.getTelefoneReclamante() != null);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    /**
     * Conjunto de unidadeIds que o usuário logado pode ver reclamações.
     * Vazio quando não autenticado ou perfil sem acesso.
     */
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
            case ADMINISTRADOR:
                Long admIdRec = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
                return unidadeRepository.findByAdminUnicoId(admIdRec).stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
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
                if (empresaIds.isEmpty()) return Set.of();
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

    /**
     * Apenas ADMIN global vê reclamações sem unidade (anônimas sem escolha).
     * Demais perfis ficam restritos às unidades autorizadas.
     */
    private boolean podeVerSemUnidade() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        return usuario != null && usuario.getPerfil() == Usuario.PerfilUsuario.ADMIN;
    }

    private boolean podeVer(Reclamacao r, Set<Long> permitidas) {
        if (r.getUnidadeId() == null) return podeVerSemUnidade();
        return permitidas.contains(r.getUnidadeId());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarTodas() {
        Set<Long> unidadesIds = obterUnidadesIdsPermitidas();
        boolean verSemUnidade = podeVerSemUnidade();
        if (unidadesIds.isEmpty() && !verSemUnidade) return List.of();
        return reclamacaoRepository.findAll().stream()
                .filter(r -> podeVer(r, unidadesIds))
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarNaoLidas() {
        Set<Long> unidadesIds = obterUnidadesIdsPermitidas();
        boolean verSemUnidade = podeVerSemUnidade();
        if (unidadesIds.isEmpty() && !verSemUnidade) return List.of();
        return reclamacaoRepository.findByLidaFalseOrderByDataCriacaoDesc().stream()
                .filter(r -> podeVer(r, unidadesIds))
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
        boolean verSemUnidade = podeVerSemUnidade();
        if (unidadesIds.isEmpty() && !verSemUnidade) return 0L;
        return reclamacaoRepository.findAll().stream()
                .filter(r -> !Boolean.TRUE.equals(r.getLida()))
                .filter(r -> podeVer(r, unidadesIds))
                .count();
    }

    @Transactional(readOnly = true)
    public Long contarNaoLidasPorUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) return 0L;
        return reclamacaoRepository.countByUnidadeIdAndLidaFalse(unidadeId);
    }

    @Transactional
    public ReclamacaoDTO marcarComoLida(Long id) {
        Reclamacao reclamacao = buscarComPermissao(id);
        reclamacao.setLida(true);
        if (reclamacao.getDataLeitura() == null) reclamacao.setDataLeitura(LocalDateTime.now());
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação marcada como lida. ID: {}", id);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    @Transactional
    public ReclamacaoDTO atualizarStatus(Long id, Reclamacao.Status novoStatus) {
        if (novoStatus == null) throw new BusinessException("Status é obrigatório");
        Reclamacao reclamacao = buscarComPermissao(id);
        reclamacao.setStatus(novoStatus);
        // RESOLVIDA/ARQUIVADA marcam como lida automaticamente
        if (novoStatus == Reclamacao.Status.RESOLVIDA || novoStatus == Reclamacao.Status.ARQUIVADA) {
            if (!Boolean.TRUE.equals(reclamacao.getLida())) {
                reclamacao.setLida(true);
                reclamacao.setDataLeitura(LocalDateTime.now());
            }
        }
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Status da reclamação {} atualizado para {}", id, novoStatus);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    @Transactional
    public ReclamacaoDTO registrarResposta(Long id, String mensagemResposta) {
        if (mensagemResposta == null || mensagemResposta.isBlank()) {
            throw new BusinessException("Resposta não pode ser vazia");
        }
        Reclamacao reclamacao = buscarComPermissao(id);
        reclamacao.setResposta(mensagemResposta.trim());
        reclamacao.setDataResposta(LocalDateTime.now());
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        reclamacao.setRespondidaPor(auth != null ? auth.getName() : "sistema");
        if (!Boolean.TRUE.equals(reclamacao.getLida())) {
            reclamacao.setLida(true);
            reclamacao.setDataLeitura(LocalDateTime.now());
        }
        // Auto-marca como RESOLVIDA quando registra resposta (gestor pode reverter)
        if (reclamacao.getStatus() == Reclamacao.Status.RECEBIDA
                || reclamacao.getStatus() == Reclamacao.Status.EM_ANALISE) {
            reclamacao.setStatus(Reclamacao.Status.RESOLVIDA);
        }
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Resposta registrada na reclamação {}", id);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    private Reclamacao buscarComPermissao(Long id) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reclamação não encontrada"));
        Set<Long> permitidas = obterUnidadesIdsPermitidas();
        if (!podeVer(reclamacao, permitidas)) {
            throw new ResourceNotFoundException("Reclamação não encontrada");
        }
        return reclamacao;
    }

    @Transactional(readOnly = true)
    public ReclamacaoDTO buscarPorId(Long id) {
        return reclamacaoMapper.toDTO(buscarComPermissao(id));
    }
}
