package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.UsuarioDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UsuarioMapper;
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

            case GERENTE:
                log.debug("GERENTE: listando usuários das unidades da mesma empresa");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return List.of();
                }
                
                // Carregar unidades com empresas para evitar lazy loading
                List<Unidade> unidadesGerente = usuarioLogado.getUnidades();
                
                // Obter IDs das empresas das unidades do gerente
                Set<Long> empresaIds = unidadesGerente.stream()
                        .map(u -> {
                            // Forçar carregamento da empresa
                            if (u.getEmpresa() == null) {
                                Unidade unidadeCompleta = unidadeRepository.findById(u.getId())
                                        .orElse(null);
                                if (unidadeCompleta != null && unidadeCompleta.getEmpresa() != null) {
                                    return unidadeCompleta.getEmpresa().getId();
                                }
                                return null;
                            }
                            return u.getEmpresa().getId();
                        })
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                
                if (empresaIds.isEmpty()) {
                    log.warn("Gerente {} não tem empresas vinculadas", email);
                    return List.of();
                }
                
                log.debug("Gerente {} tem acesso às empresas: {}", email, empresaIds);
                
                // Obter IDs de todas as unidades das mesmas empresas
                List<Unidade> todasUnidades = unidadeRepository.findAll();
                List<Long> unidadesIds = todasUnidades.stream()
                        .filter(u -> {
                            if (u.getEmpresa() == null) {
                                return false;
                            }
                            return empresaIds.contains(u.getEmpresa().getId());
                        })
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                
                log.debug("Unidades acessíveis pelo gerente {}: {}", email, unidadesIds);
                
                List<Usuario> todosUsuarios = usuarioRepository.findAll();
                List<Usuario> usuariosFiltrados = todosUsuarios.stream()
                        .filter(u -> {
                            if (Usuario.PerfilUsuario.ADMIN.equals(u.getPerfil())) {
                                return false;
                            }
                            if (u.getUnidades() == null || u.getUnidades().isEmpty()) {
                                return false;
                            }
                            boolean todasUnidadesNaEmpresa = u.getUnidades().stream()
                                    .allMatch(unidade -> unidadesIds.contains(unidade.getId()));
                            return todasUnidadesNaEmpresa;
                        })
                        .collect(Collectors.toList());
                
                log.debug("Gerente {} pode ver {} usuários de {} total", email, usuariosFiltrados.size(), todosUsuarios.size());
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
                
                return usuarioRepository.findAll().stream()
                        .filter(u -> {
                            if (Usuario.PerfilUsuario.ADMIN.equals(u.getPerfil()) || Usuario.PerfilUsuario.GERENTE.equals(u.getPerfil())) {
                                return false;
                            }
                            if (u.getUnidades() == null || u.getUnidades().isEmpty()) {
                                return false;
                            }
                            return u.getUnidades().stream()
                                    .anyMatch(unidade -> unidadesProfissional.contains(unidade.getId()));
                        })
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
        log.info("Usuário criado com sucesso. ID: {}, Email: {}, Perfil: {}", 
                usuario.getId(), usuario.getEmail(), usuario.getPerfil());
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

        usuario = usuarioRepository.save(usuario);
        log.info("Usuário atualizado com sucesso. ID: {}, Perfil: {}", usuario.getId(), usuario.getPerfil());
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
