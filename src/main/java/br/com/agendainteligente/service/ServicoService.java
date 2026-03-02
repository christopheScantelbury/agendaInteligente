package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.dto.ServicoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ServicoMapper;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final ServicoMapper servicoMapper;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final PerfilService perfilService;

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarTodos() {
        log.debug("Listando todos os serviços");
        List<Servico> servicos = filtrarPorPermissao();
        return servicos.stream()
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarAtivos() {
        log.debug("Listando serviços ativos");
        List<Servico> servicos = filtrarPorPermissao();
        return servicos.stream()
                .filter(Servico::getAtivo)
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarPorUnidade(Long unidadeId) {
        log.debug("Listando serviços da unidade: {}", unidadeId);
        validarAcessoUnidade(unidadeId);
        return servicoRepository.findByUnidadeId(unidadeId).stream()
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ServicoDTO> listarAtivosPorUnidade(Long unidadeId) {
        log.debug("Listando serviços ativos da unidade: {}", unidadeId);
        validarAcessoUnidade(unidadeId);
        return servicoRepository.findByUnidadeIdAndAtivoTrue(unidadeId).stream()
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    private List<Servico> filtrarPorPermissao() {
        Usuario usuario = getUsuarioLogado();
        Usuario.PerfilUsuario perfil = usuario.getPerfil();
        Long adminUnicoId = getAdminUnicoIdDoUsuario(usuario);

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os serviços");
                return servicoRepository.findAll();
            case ADMINISTRADOR:
                log.debug("ADMINISTRADOR: listando serviços vinculados ao admin_unico_id={}", usuario.getId());
                return servicoRepository.findByAdminUnicoId(usuario.getId());
            case GERENTE:
                log.debug("GERENTE: listando serviços vinculados ao admin_unico_id={}", adminUnicoId);
                if (adminUnicoId == null) {
                    log.warn("Gerente {} sem admin_unico_id vinculado", usuario.getEmail());
                    return List.of();
                }
                return servicoRepository.findByAdminUnicoId(adminUnicoId);
            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando serviços vinculados ao admin_unico_id={}", adminUnicoId);
                if (adminUnicoId == null) {
                    log.warn("Profissional {} sem admin_unico_id vinculado", usuario.getEmail());
                    return List.of();
                }
                return servicoRepository.findByAdminUnicoId(adminUnicoId);
            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia");
                return List.of();
        }
    }

    private Set<Long> obterUnidadesIdsPermitidas() {
        Usuario usuario = getUsuarioLogado();
        switch (usuario.getPerfil()) {
            case ADMIN:
                return unidadeRepository.findAll().stream().map(Unidade::getId).collect(Collectors.toSet());
            case ADMINISTRADOR:
                return unidadeRepository.findByAdminUnicoId(usuario.getId()).stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
            case GERENTE:
                Long adminUnicoIdGerente = getAdminUnicoIdDoUsuario(usuario);
                if (adminUnicoIdGerente != null) {
                    return unidadeRepository.findByAdminUnicoId(adminUnicoIdGerente).stream()
                            .map(Unidade::getId)
                            .collect(Collectors.toSet());
                }
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
                Long adminUnicoIdProfissional = getAdminUnicoIdDoUsuario(usuario);
                if (adminUnicoIdProfissional != null) {
                    return unidadeRepository.findByAdminUnicoId(adminUnicoIdProfissional).stream()
                            .map(Unidade::getId)
                            .collect(Collectors.toSet());
                }
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    return Set.of();
                }
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default:
                return Set.of();
        }
    }

    private void validarAcessoUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            throw new BusinessException("Você não tem permissão para acessar esta unidade");
        }
    }

    /** Exige permissão EDITAR em /servicos (ADMIN sempre pode). Quem tem só VISUALIZAR não pode criar/editar/excluir. */
    private void validarPermissaoEditarServicos() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Não autorizado");
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (usuario.getPerfil() == Usuario.PerfilUsuario.ADMIN || usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        PerfilDTO perfil = perfilService.buscarPerfilDoUsuarioLogado();
        if (perfil.getPermissoesGranulares() == null
                || !"EDITAR".equals(perfil.getPermissoesGranulares().get("/servicos"))) {
            throw new AccessDeniedException("Sem permissão para editar serviços. Apenas visualização permitida.");
        }
    }

    @Transactional(readOnly = true)
    public ServicoDTO buscarPorId(Long id) {
        log.debug("Buscando serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        validarAcessoAdminUnico(getUsuarioLogado(), servico);
        if (servico.getUnidade() == null || !obterUnidadesIdsPermitidas().contains(servico.getUnidade().getId())) {
            throw new ResourceNotFoundException("Serviço não encontrado com id: " + id);
        }
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO criar(ServicoDTO servicoDTO) {
        validarPermissaoEditarServicos();
        log.debug("Criando novo serviço: {}", servicoDTO);
        Usuario usuarioLogado = getUsuarioLogado();

        if (servicoDTO.getUnidadeId() == null && usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            Set<Long> unidadesPermitidas = obterUnidadesIdsPermitidas();
            if (unidadesPermitidas.size() == 1) {
                servicoDTO.setUnidadeId(unidadesPermitidas.iterator().next());
            }
        }
        
        if (servicoDTO.getUnidadeId() == null) {
            throw new BusinessException("Unidade é obrigatória para criar um serviço");
        }

        // Validar acesso à unidade
        validarAcessoUnidade(servicoDTO.getUnidadeId());

        // Buscar unidade
        Unidade unidade = unidadeRepository.findById(servicoDTO.getUnidadeId())
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));

        if (!unidade.getAtivo()) {
            throw new BusinessException("Unidade não está ativa");
        }

        Servico servico = servicoMapper.toEntity(servicoDTO);
        servico.setUnidade(unidade);
        servico.setAdminUnicoId(getAdminUnicoIdDoUsuario(usuarioLogado));
        servico = servicoRepository.save(servico);
        log.info("Serviço criado com sucesso. ID: {}, Unidade: {}", servico.getId(), unidade.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO atualizar(Long id, ServicoDTO servicoDTO) {
        validarPermissaoEditarServicos();
        log.debug("Atualizando serviço com id: {}", id);
        Usuario usuarioLogado = getUsuarioLogado();
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        validarAcessoAdminUnico(usuarioLogado, servico);

        // Validar acesso à unidade do serviço atual
        if (servico.getUnidade() != null) {
            validarAcessoUnidade(servico.getUnidade().getId());
        }

        // Se estiver mudando de unidade, validar acesso à nova unidade
        if (servicoDTO.getUnidadeId() != null && 
            (servico.getUnidade() == null || !servico.getUnidade().getId().equals(servicoDTO.getUnidadeId()))) {
            validarAcessoUnidade(servicoDTO.getUnidadeId());
            
            Unidade novaUnidade = unidadeRepository.findById(servicoDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            
            if (!novaUnidade.getAtivo()) {
                throw new BusinessException("Unidade não está ativa");
            }
            
            servico.setUnidade(novaUnidade);
        }

        servicoMapper.updateEntityFromDTO(servicoDTO, servico);
        servico.setAdminUnicoId(getAdminUnicoIdDoUsuario(usuarioLogado));
        servico = servicoRepository.save(servico);
        log.info("Serviço atualizado com sucesso. ID: {}", servico.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public void excluir(Long id) {
        validarPermissaoEditarServicos();
        log.debug("Excluindo serviço com id: {}", id);
        Usuario usuarioLogado = getUsuarioLogado();
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        validarAcessoAdminUnico(usuarioLogado, servico);
        if (servico.getUnidade() == null || !obterUnidadesIdsPermitidas().contains(servico.getUnidade().getId())) {
            throw new ResourceNotFoundException("Serviço não encontrado com id: " + id);
        }
        servicoRepository.deleteById(id);
        log.info("Serviço excluído com sucesso. ID: {}", id);
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private Long getAdminUnicoIdDoUsuario(Usuario usuario) {
        if (usuario == null) return null;
        if (usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) return usuario.getId();
        return usuario.getAdminUnicoId();
    }

    private void validarAcessoAdminUnico(Usuario usuarioLogado, Servico servico) {
        if (usuarioLogado == null || servico == null) {
            return;
        }
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMIN) {
            return;
        }
        Long adminUnicoIdUsuario = getAdminUnicoIdDoUsuario(usuarioLogado);
        if (!Objects.equals(adminUnicoIdUsuario, servico.getAdminUnicoId())) {
            throw new ResourceNotFoundException("Serviço não encontrado");
        }
    }
}
