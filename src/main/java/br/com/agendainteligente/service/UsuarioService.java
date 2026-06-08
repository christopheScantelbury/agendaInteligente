package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.UsuarioDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UsuarioMapper;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.PerfilRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final PerfilRepository perfilRepository;
    private final AtendenteRepository atendenteRepository;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioMapper usuarioMapper;

    @Transactional(readOnly = true)
    public List<UsuarioDTO> listarTodos() {
        List<Usuario> usuarios = filtrarPorPermissao();
        return usuarios.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Filtra usuários baseado no perfil e unidades do usuário logado.
     * - ADMIN: vê todos os usuários
     * - GERENTE: vê apenas usuários das unidades da mesma empresa
     * - PROFISSIONAL: vê apenas usuários da mesma unidade
     * - CLIENTE: não deve acessar esta funcionalidade
     */
    private List<Usuario> filtrarPorPermissao() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Tentativa de listar usuários sem autenticação");
            return List.of();
        }

        String email = auth.getName();
        Usuario usuarioLogado = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        Usuario.PerfilUsuario perfil = usuarioLogado.getPerfil();

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os usuários");
                return usuarioRepository.findAll();
            case ADMINISTRADOR:
                log.debug("ADMINISTRADOR: listando o próprio admin, administradores filhos e profissionais vinculados ao admin_unico_id={}", usuarioLogado.getId());
                // Hardening #149: pré-narrowing por adminUnicoId no banco em vez de findAll().
                // Inclui (a) o próprio admin, (b) usuários com adminUnicoId = admin.id e
                // (c) usuários vinculados às unidades do admin (caso legacy sem adminUnicoId
                // setado, contemplado pelo helper pertenceAoEscopoDoAdministrador).
                java.util.Set<Long> candidatosAdmIds = new java.util.LinkedHashSet<>();
                candidatosAdmIds.add(usuarioLogado.getId());
                usuarioRepository.findByAdminUnicoId(usuarioLogado.getId())
                        .forEach(u -> candidatosAdmIds.add(u.getId()));
                List<Long> unidadeIdsDoAdm = unidadeRepository.findByAdminUnicoId(usuarioLogado.getId())
                        .stream().map(Unidade::getId).collect(Collectors.toList());
                if (!unidadeIdsDoAdm.isEmpty()) {
                    usuarioRepository.findDistinctByUnidadesIdIn(unidadeIdsDoAdm)
                            .forEach(u -> candidatosAdmIds.add(u.getId()));
                }
                if (candidatosAdmIds.isEmpty()) {
                    return List.of();
                }
                return usuarioRepository.findAllById(candidatosAdmIds).stream()
                        .filter(u -> pertenceAoEscopoDoAdministrador(usuarioLogado, u))
                        .filter(u -> usuarioLogado.getId().equals(u.getId())
                                || Usuario.PerfilUsuario.ADMINISTRADOR.equals(u.getPerfil())
                                || Usuario.PerfilUsuario.PROFISSIONAL.equals(u.getPerfil())
                                || (u.getPerfilEntity() != null && Boolean.TRUE.equals(u.getPerfilEntity().getAtendente()))
                                || atendenteRepository.findByUsuarioId(u.getId()).isPresent())
                        .collect(Collectors.toList());

            case GERENTE:
                log.debug("GERENTE: listando usuários das unidades da mesma empresa");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return List.of();
                }

                // Hardening #149: resolver empresaIds via query (evita lazy-load por unidade)
                // e empresa→unidades via findByEmpresaIdIn em vez de findAll() + filter.
                List<Long> gerenteUnidadeIds = usuarioLogado.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                Set<Long> empresaIds = new java.util.HashSet<>(unidadeRepository.findEmpresaIdsByIds(gerenteUnidadeIds));

                if (empresaIds.isEmpty()) {
                    log.warn("Gerente {} não tem empresas vinculadas", email);
                    return List.of();
                }

                log.debug("Gerente {} tem acesso às empresas: {}", email, empresaIds);

                List<Long> unidadesIds = unidadeRepository.findByEmpresaIdIn(empresaIds).stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());

                log.debug("Unidades acessíveis pelo gerente {}: {}", email, unidadesIds);

                if (unidadesIds.isEmpty()) {
                    return List.of();
                }

                // Pré-narrowing pelo banco: só usuários com ≥1 unidade no conjunto.
                // O filter posterior mantém o invariante original (todas as unidades do
                // usuário precisam estar no conjunto de unidades acessíveis ao gerente).
                List<Usuario> candidatos = usuarioRepository.findDistinctByUnidadesIdIn(unidadesIds);
                Set<Long> unidadesIdsSet = new java.util.HashSet<>(unidadesIds);
                List<Usuario> usuariosFiltrados = candidatos.stream()
                        .filter(u -> {
                            if (Usuario.PerfilUsuario.ADMIN.equals(u.getPerfil())
                                    || Usuario.PerfilUsuario.ADMINISTRADOR.equals(u.getPerfil())) {
                                return false;
                            }
                            if (u.getUnidades() == null || u.getUnidades().isEmpty()) {
                                return false;
                            }
                            boolean todasUnidadesNaEmpresa = u.getUnidades().stream()
                                    .allMatch(unidade -> unidadesIdsSet.contains(unidade.getId()));
                            return todasUnidadesNaEmpresa;
                        })
                        .collect(Collectors.toList());

                log.debug("Gerente {} pode ver {} usuários (pré-narrowing: {} candidatos)",
                        email, usuariosFiltrados.size(), candidatos.size());
                return usuariosFiltrados;

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando usuários da mesma unidade");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Profissional {} não tem unidades vinculadas", email);
                    return List.of();
                }
                
                List<Long> unidadesProfissional = usuarioLogado.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());

                // Hardening #149: pré-narrowing pelo banco. anyMatch(contains) é equivalente
                // a "tem ao menos uma unidade no conjunto", então findDistinctByUnidadesIdIn
                // já entrega o universo correto — só restam os filtros de perfil.
                return usuarioRepository.findDistinctByUnidadesIdIn(unidadesProfissional).stream()
                        .filter(u -> !Usuario.PerfilUsuario.ADMIN.equals(u.getPerfil())
                                && !Usuario.PerfilUsuario.ADMINISTRADOR.equals(u.getPerfil())
                                && !Usuario.PerfilUsuario.GERENTE.equals(u.getPerfil()))
                        .collect(Collectors.toList());

            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia");
                return List.of();
        }
    }

    @Transactional(readOnly = true)
    public UsuarioDTO buscarPorId(Long id) {
        return filtrarPorPermissao().stream()
                .filter(u -> u.getId().equals(id))
                .findFirst()
                .map(this::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    @Transactional
    public UsuarioDTO criar(UsuarioDTO usuarioDTO) {
        Usuario usuarioLogado = getUsuarioLogado();

        if (usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new BusinessException("Já existe um usuário com este email");
        }

        if (usuarioDTO.getSenha() == null || usuarioDTO.getSenha().trim().isEmpty()) {
            throw new BusinessException("Senha é obrigatória");
        }

        // Determinar perfil: prioriza perfilSistema, depois perfilId, depois campo perfil (compatibilidade)
        Usuario.PerfilUsuario perfilSistema = usuarioDTO.getPerfilSistema();
        if (perfilSistema == null && usuarioDTO.getPerfil() != null) {
            perfilSistema = usuarioDTO.getPerfil(); // Compatibilidade com código antigo
        }
        if (perfilSistema == null && usuarioDTO.getPerfilId() == null) {
            throw new BusinessException("Perfil é obrigatório (perfilSistema ou perfilId)");
        }

        Usuario usuario = usuarioMapper.toEntity(usuarioDTO);
        usuario.setSenha(passwordEncoder.encode(usuarioDTO.getSenha()));

        // Setar perfil do sistema
        if (perfilSistema != null) {
            usuario.setPerfilSistema(perfilSistema);
        }

        // Setar perfil customizado se fornecido
        if (usuarioDTO.getPerfilId() != null) {
            Perfil perfil = perfilRepository.findById(usuarioDTO.getPerfilId())
                    .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
            usuario.setPerfil(perfil);
        }

        // Associar unidades ao usuário
        if (usuarioDTO.getUnidadesIds() != null && !usuarioDTO.getUnidadesIds().isEmpty()) {
            List<Unidade> unidades = unidadeRepository.findAllById(usuarioDTO.getUnidadesIds());
            if (unidades.size() != usuarioDTO.getUnidadesIds().size()) {
                throw new BusinessException("Uma ou mais unidades não foram encontradas");
            }
            usuario.setUnidades(unidades);
        } else if (usuarioDTO.getUnidadeId() != null) {
            // Compatibilidade com código antigo - se tiver unidadeId, converter para lista
            Unidade unidade = unidadeRepository.findById(usuarioDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            usuario.setUnidades(List.of(unidade));
        }

        // Validar unidades quando o perfil exige (GERENTE, PROFISSIONAL, CLIENTE)
        Usuario.PerfilUsuario perfilFinalCriar = usuario.getPerfil();
        if (perfilFinalCriar == Usuario.PerfilUsuario.GERENTE || perfilFinalCriar == Usuario.PerfilUsuario.PROFISSIONAL
                || perfilFinalCriar == Usuario.PerfilUsuario.CLIENTE) {
            if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                throw new BusinessException("Usuários com este perfil devem ter pelo menos uma unidade associada");
            }
        }

        usuario = usuarioRepository.save(usuario);

        if (perfilSistema == Usuario.PerfilUsuario.ADMINISTRADOR) {
            usuario.setAdminUnicoId(usuario.getId());
            usuario = usuarioRepository.save(usuario);
        } else if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            usuario.setAdminUnicoId(usuarioLogado.getId());
            usuario = usuarioRepository.save(usuario);
        }

        log.info("Usuário criado com sucesso. ID: {}, Email: {}, Perfil: {}", 
                usuario.getId(), usuario.getEmail(), usuario.getPerfil());
        return toDTO(usuario);
    }

    @Transactional
    public UsuarioDTO atualizar(Long id, UsuarioDTO usuarioDTO) {
        Usuario usuarioLogado = getUsuarioLogado();
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        validarAcessoAdminUnico(usuarioLogado, usuario);

        // Verifica se email está sendo alterado e se já existe outro usuário com ele
        if (!usuario.getEmail().equals(usuarioDTO.getEmail())
                && usuarioRepository.existsByEmail(usuarioDTO.getEmail())) {
            throw new BusinessException("Já existe outro usuário cadastrado com este email");
        }

        usuarioMapper.updateEntityFromDTO(usuarioDTO, usuario);

        // Atualizar perfil do sistema se fornecido
        // Nota: Se o frontend enviar "ATENDENTE", o Jackson pode falhar ao fazer parse
        // Nesse caso, o perfilSistema virá null e usaremos o campo perfil
        if (usuarioDTO.getPerfilSistema() != null) {
            usuario.setPerfilSistema(usuarioDTO.getPerfilSistema());
        } else if (usuarioDTO.getPerfil() != null) {
            // Compatibilidade com código antigo
            // Se o perfil for "ATENDENTE" (que não existe no enum), tratar como PROFISSIONAL
            try {
                usuario.setPerfilSistema(usuarioDTO.getPerfil());
            } catch (IllegalArgumentException e) {
                // Se o enum não conseguir fazer parse (ex: "ATENDENTE"), usar PROFISSIONAL
                log.warn("Perfil inválido recebido: {}. Convertendo para PROFISSIONAL", usuarioDTO.getPerfil());
                usuario.setPerfilSistema(Usuario.PerfilUsuario.PROFISSIONAL);
            }
        }

        // Atualizar perfil customizado se fornecido
        if (usuarioDTO.getPerfilId() != null) {
            Perfil perfil = perfilRepository.findById(usuarioDTO.getPerfilId())
                    .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
            usuario.setPerfil(perfil);
        } else if (usuarioDTO.getPerfilId() == null && usuarioDTO.getPerfilSistema() != null) {
            // Se perfilSistema foi fornecido mas perfilId não, limpar perfil customizado
            usuario.setPerfil(null);
        }

        // Atualiza senha apenas se fornecida
        if (usuarioDTO.getSenha() != null && !usuarioDTO.getSenha().trim().isEmpty()) {
            usuario.setSenha(passwordEncoder.encode(usuarioDTO.getSenha()));
        }

        // Determinar o perfil final após atualização (usa entity quando perfilId foi aplicado)
        Usuario.PerfilUsuario perfilFinal = usuario.getPerfilSistema();
        if (perfilFinal == null && usuario.getPerfilEntity() != null) {
            perfilFinal = usuario.getPerfil(); // deriva do perfil customizado
        }
        if (perfilFinal == null && usuarioDTO.getPerfilSistema() != null) {
            perfilFinal = usuarioDTO.getPerfilSistema();
        } else if (perfilFinal == null && usuarioDTO.getPerfil() != null) {
            perfilFinal = usuarioDTO.getPerfil();
        }

        // Atualizar unidades associadas
        if (usuarioDTO.getUnidadesIds() != null) {
            if (usuarioDTO.getUnidadesIds().isEmpty()) {
                // Validar se o perfil requer unidades
                if (perfilFinal == Usuario.PerfilUsuario.GERENTE || 
                    perfilFinal == Usuario.PerfilUsuario.PROFISSIONAL) {
                    throw new BusinessException("Usuários com perfil " + perfilFinal + " devem ter pelo menos uma unidade associada");
                }
                usuario.setUnidades(List.of());
            } else {
                List<Unidade> unidades = unidadeRepository.findAllById(usuarioDTO.getUnidadesIds());
                if (unidades.size() != usuarioDTO.getUnidadesIds().size()) {
                    throw new BusinessException("Uma ou mais unidades não foram encontradas");
                }
                usuario.setUnidades(unidades);
            }
        } else if (usuarioDTO.getUnidadeId() != null) {
            // Compatibilidade com código antigo
            Unidade unidade = unidadeRepository.findById(usuarioDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
            usuario.setUnidades(List.of(unidade));
        } else {
            // Se não foi fornecido unidadesIds nem unidadeId, verificar se precisa validar
            // Se está mudando para um perfil que requer unidades, validar
            if (perfilFinal == Usuario.PerfilUsuario.GERENTE || 
                perfilFinal == Usuario.PerfilUsuario.PROFISSIONAL) {
                // Se o usuário não tem unidades e está mudando para um perfil que requer, validar
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    throw new BusinessException("Usuários com perfil " + perfilFinal + " devem ter pelo menos uma unidade associada");
                }
            }
        }

        // Validação final: garantir que perfis que requerem unidades tenham pelo menos uma
        if (perfilFinal == Usuario.PerfilUsuario.GERENTE || 
            perfilFinal == Usuario.PerfilUsuario.PROFISSIONAL ||
            perfilFinal == Usuario.PerfilUsuario.CLIENTE) {
            if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                throw new BusinessException("Usuários com perfil " + perfilFinal + " devem ter pelo menos uma unidade associada");
            }
        }

        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            usuario.setAdminUnicoId(usuarioLogado.getId());
        }

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário atualizado com sucesso. ID: {}, Perfil: {}", usuario.getId(), usuario.getPerfil());
        return toDTO(usuario);
    }

    /**
     * Altera a senha de qualquer usuário. Somente ADMIN pode executar.
     * Quando o admin altera a própria senha, senhaAtual é obrigatória para verificação.
     */
    @Transactional
    public void alterarSenhaPorAdmin(Long id, String novaSenha, String senhaAtual) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        Usuario admin = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (admin.getPerfil() != Usuario.PerfilUsuario.ADMIN && admin.getPerfil() != Usuario.PerfilUsuario.ADMINISTRADOR) {
            throw new BusinessException("Somente ADMIN e ADMINISTRADOR podem alterar a senha de outros usuários");
        }
        if (novaSenha == null || novaSenha.trim().isEmpty()) {
            throw new BusinessException("Nova senha é obrigatória");
        }
        Usuario alvo = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        validarAcessoAdminUnico(admin, alvo);
        if (admin.getId().equals(alvo.getId())) {
            if (senhaAtual == null || senhaAtual.trim().isEmpty()) {
                throw new BusinessException("Senha atual é obrigatória para alterar a própria senha");
            }
            if (!passwordEncoder.matches(senhaAtual.trim(), alvo.getSenha())) {
                throw new BusinessException("Senha atual incorreta");
            }
        }
        alvo.setSenha(passwordEncoder.encode(novaSenha.trim()));
        usuarioRepository.save(alvo);
        log.info("Senha do usuário ID={} alterada por {} email={}", id, admin.getPerfil(), admin.getEmail());
    }

    @Transactional
    public void excluir(Long id) {
        Usuario usuarioLogado = getUsuarioLogado();
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        validarAcessoAdminUnico(usuarioLogado, usuario);
        usuarioRepository.deleteById(id);
        log.info("Usuário excluído com sucesso. ID: {}", id);
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private void validarAcessoAdminUnico(Usuario usuarioLogado, Usuario alvo) {
        if (usuarioLogado == null || alvo == null) {
            return;
        }
        if (usuarioLogado.getPerfil() != Usuario.PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        if (pertenceAoEscopoDoAdministrador(usuarioLogado, alvo)) {
            return;
        }
        throw new ResourceNotFoundException("Usuário não encontrado");
    }

    private boolean pertenceAoEscopoDoAdministrador(Usuario administrador, Usuario alvo) {
        if (administrador == null || alvo == null) {
            return false;
        }
        if (administrador.getId().equals(alvo.getId())) {
            return true;
        }
        if (administrador.getId().equals(alvo.getAdminUnicoId())) {
            return true;
        }
        if (alvo.getAdminUnicoId() != null) {
            return false;
        }

        boolean pertenceSomenteUnidadesDoAdmin = alvo.getUnidades() != null
                && !alvo.getUnidades().isEmpty()
                && alvo.getUnidades().stream()
                .allMatch(unidade -> administrador.getId().equals(unidade.getAdminUnicoId()));

        boolean atendenteDaUnidadeDoAdmin = atendenteRepository.findByUsuarioId(alvo.getId())
                .map(atendente -> atendente.getUnidade() != null
                        && administrador.getId().equals(atendente.getUnidade().getAdminUnicoId()))
                .orElse(false);

        return pertenceSomenteUnidadesDoAdmin || atendenteDaUnidadeDoAdmin;
    }

    private UsuarioDTO toDTO(Usuario usuario) {
        UsuarioDTO dto = usuarioMapper.toDTO(usuario);

        if (usuario.getPerfilEntity() != null && usuario.getPerfilEntity().getNome() != null) {
            dto.setNomePerfil(usuario.getPerfilEntity().getNome());
        } else if (usuario.getPerfil() != null) {
            dto.setNomePerfil(usuario.getPerfil().name());
        }
        
        // Preencher lista de IDs de unidades
        if (usuario.getUnidades() != null && !usuario.getUnidades().isEmpty()) {
            dto.setUnidadesIds(usuario.getUnidades().stream()
                    .map(Unidade::getId)
                    .collect(Collectors.toList()));
            dto.setNomesUnidades(usuario.getUnidades().stream()
                    .map(Unidade::getNome)
                    .collect(Collectors.toList()));
            // Compatibilidade: se tiver apenas uma unidade, setar unidadeId
            if (usuario.getUnidades().size() == 1) {
                dto.setUnidadeId(usuario.getUnidades().get(0).getId());
                dto.setNomeUnidade(usuario.getUnidades().get(0).getNome());
            }
        }
        
        return dto;
    }
}
