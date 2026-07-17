package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PerfilMapper;
import br.com.agendainteligente.repository.PerfilRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PerfilService {

    private final PerfilRepository perfilRepository;
    private final PerfilMapper perfilMapper;
    private final UsuarioRepository usuarioRepository;

    // ── #171 SEC: escopo por tenant ─────────────────────────────────────────

    /**
     * Tenant do usuário logado. ADMIN global → null (enxerga tudo).
     * Ver feedback-isolamento-administrador: NUNCA agrupar ADMIN+ADMINISTRADOR.
     */
    private Long tenantDoLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        Usuario u = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN) return null;
        return u.getAdminUnicoId() != null ? u.getAdminUnicoId() : u.getId();
    }

    private boolean ehAdminGlobal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return false;
        return usuarioRepository.findByEmail(auth.getName())
                .map(u -> u.getPerfil() == Usuario.PerfilUsuario.ADMIN)
                .orElse(false);
    }

    /** Garante que o cargo pertence ao tenant do logado (ou é ADMIN global). */
    private void validarAcesso(Perfil perfil) {
        if (ehAdminGlobal()) return;
        Long tenant = tenantDoLogado();
        // Perfil global de sistema: visível a todos, mas não editável (checado à parte).
        if (perfil.getAdminUnicoId() == null) return;
        if (!perfil.getAdminUnicoId().equals(tenant)) {
            // 404 em vez de 403 — não revela existência de recurso de outro tenant.
            throw new ResourceNotFoundException("Perfil não encontrado");
        }
    }

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarTodos() {
        // #171 SEC: era findAll() → vazava cargos de outros tenants.
        if (ehAdminGlobal()) {
            return perfilRepository.findAll().stream().map(perfilMapper::toDTO).collect(Collectors.toList());
        }
        return perfilRepository.findVisiveisPorTenant(tenantDoLogado()).stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarAtivos() {
        if (ehAdminGlobal()) {
            return perfilRepository.findByAtivoTrue().stream().map(perfilMapper::toDTO).collect(Collectors.toList());
        }
        return perfilRepository.findVisiveisPorTenant(tenantDoLogado()).stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PerfilDTO> listarCustomizados() {
        if (ehAdminGlobal()) {
            return perfilRepository.findBySistemaFalse().stream().map(perfilMapper::toDTO).collect(Collectors.toList());
        }
        return perfilRepository.findByAdminUnicoIdAndAtivoTrueOrderByNomeAsc(tenantDoLogado()).stream()
                .map(perfilMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PerfilDTO buscarPorId(Long id) {
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        validarAcesso(perfil);
        return perfilMapper.toDTO(perfil);
    }

    @Transactional(readOnly = true)
    public PerfilDTO buscarPorNome(String nome) {
        Perfil perfil = perfilRepository.findByNome(nome)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        return perfilMapper.toDTO(perfil);
    }

    /**
     * Retorna o perfil do usuário autenticado (customizado ou do sistema), para uso nas permissões do frontend.
     */
    @Transactional(readOnly = true)
    public PerfilDTO buscarPerfilDoUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado");
        }
        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        Perfil perfil = usuario.getPerfilEntity();
        if (perfil != null) {
            return perfilMapper.toDTO(perfil);
        }
        // Perfil de sistema sem entidade: tentar carregar por nome do enum (ex: GERENTE, ADMIN)
        return perfilRepository.findByNome(usuario.getPerfil().name())
                .or(() -> {
                    if (usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
                        return perfilRepository.findByNome(Usuario.PerfilUsuario.ADMIN.name());
                    }
                    return java.util.Optional.empty();
                })
                .map(perfilMapper::toDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil do usuário não encontrado"));
    }

    private void validarPermissaoEditarPerfis() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Sem permissão para editar perfis");
        }
        if (auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return;
        }
        PerfilDTO meuPerfil = buscarPerfilDoUsuarioLogado();
        if (meuPerfil.getPermissoesGranulares() != null
                && "EDITAR".equals(meuPerfil.getPermissoesGranulares().get("/perfis"))) {
            return;
        }
        throw new AccessDeniedException("Sem permissão para editar perfis. Apenas visualização permitida.");
    }

    /**
     * #171 SEC: impede escalada de privilégio — ninguém cria cargo com base
     * acima do próprio nível. ADMINISTRADOR não pode fabricar um cargo ADMIN.
     */
    private void validarBasePermitida(Usuario.PerfilUsuario base) {
        if (base == null) return;
        if (ehAdminGlobal()) return; // ADMIN global pode tudo
        if (base == Usuario.PerfilUsuario.ADMIN) {
            throw new BusinessException("Não é possível criar cargo com permissões de administrador da plataforma");
        }
    }

    @Transactional
    public PerfilDTO criar(PerfilDTO perfilDTO) {
        validarPermissaoEditarPerfis();
        validarBasePermitida(perfilDTO.getPerfilSistemaBase());

        // #171: nome é único DENTRO do tenant (antes era global — impedia duas
        // empresas de terem "Recepção").
        Long tenant = tenantDoLogado();
        if (tenant != null && perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(tenant, perfilDTO.getNome())) {
            throw new BusinessException("Já existe um cargo com este nome na sua empresa");
        }

        // Perfis customizados não podem ser do sistema
        perfilDTO.setSistema(false);

        Perfil perfil = perfilMapper.toEntity(perfilDTO);
        perfil.setSistema(false);
        perfil.setAdminUnicoId(tenant); // ADMIN global (null) cria perfil global
        if (perfil.getPerfilSistemaBase() == null) {
            perfil.setPerfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL);
        }
        // Mantém as flags legadas coerentes com a base escolhida.
        sincronizarFlagsLegadas(perfil);
        perfil = perfilRepository.save(perfil);
        log.info("Cargo criado. ID: {}, Nome: {}, base: {}, tenant: {}",
                perfil.getId(), perfil.getNome(), perfil.getPerfilSistemaBase(), tenant);
        return perfilMapper.toDTO(perfil);
    }

    /** Flags booleanas antigas (atendente/gerente/cliente) derivam da base. */
    private void sincronizarFlagsLegadas(Perfil p) {
        Usuario.PerfilUsuario base = p.getPerfilSistemaBase();
        p.setAtendente(base == Usuario.PerfilUsuario.PROFISSIONAL);
        p.setGerente(base == Usuario.PerfilUsuario.GERENTE);
        p.setCliente(base == Usuario.PerfilUsuario.CLIENTE);
    }

    @Transactional
    public PerfilDTO atualizar(Long id, PerfilDTO perfilDTO) {
        validarPermissaoEditarPerfis();
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        validarAcesso(perfil);
        validarBasePermitida(perfilDTO.getPerfilSistemaBase());

        // Se for perfil do sistema, permitir editar apenas permissões de acesso
        // (mantendo nome/descrição/sistema fixos).
        if (perfil.getSistema()) {
            Map<String, String> granulares = perfilDTO.getPermissoesGranulares();
            List<String> menus = perfilDTO.getPermissoesMenu();

            // Se vier apenas granular, deriva a lista de menus para compatibilidade.
            if ((menus == null || menus.isEmpty()) && granulares != null && !granulares.isEmpty()) {
                menus = extrairMenusPermitidos(granulares);
            }
            // Se vier apenas menu (compatibilidade), deriva granular como VISUALIZAR.
            if ((granulares == null || granulares.isEmpty()) && menus != null && !menus.isEmpty()) {
                granulares = menus.stream().collect(Collectors.toMap(m -> m, m -> "VISUALIZAR"));
            }

            perfil.setPermissoesMenu(serializePermissoesMenu(menus));
            perfil.setPermissoesGranulares(serializePermissoesGranulares(granulares));
            perfil = perfilRepository.save(perfil);
            log.info("Permissões do perfil do sistema atualizadas. ID: {}, Nome: {}", id, perfil.getNome());
            return perfilMapper.toDTO(perfil);
        }

        // Para perfis customizados, permitir editar tudo exceto sistema/tenant.
        // #171: nome único DENTRO do tenant.
        if (!perfil.getNome().equals(perfilDTO.getNome())) {
            Long tenantAtual = perfil.getAdminUnicoId();
            if (tenantAtual != null
                    && perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(tenantAtual, perfilDTO.getNome())) {
                throw new BusinessException("Já existe um cargo com este nome na sua empresa");
            }
        }

        // Garantir que não vire perfil do sistema
        perfilDTO.setSistema(false);

        Long tenantOriginal = perfil.getAdminUnicoId();
        perfilMapper.updateEntityFromDTO(perfilDTO, perfil);
        perfil.setSistema(false);
        perfil.setAdminUnicoId(tenantOriginal); // #171: dono nunca muda por payload
        if (perfil.getPerfilSistemaBase() == null) {
            perfil.setPerfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL);
        }
        sincronizarFlagsLegadas(perfil);
        perfil = perfilRepository.save(perfil);
        log.info("Cargo atualizado. ID: {}, base: {}", id, perfil.getPerfilSistemaBase());
        return perfilMapper.toDTO(perfil);
    }

    @Transactional
    public void excluir(Long id) {
        validarPermissaoEditarPerfis();
        Perfil perfil = perfilRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado"));
        validarAcesso(perfil);

        // Não permitir excluir perfis do sistema
        if (perfil.getSistema()) {
            throw new BusinessException("Não é possível excluir perfis do sistema");
        }

        // Verificar se tem usuários vinculados
        if (perfil.getUsuarios() != null && !perfil.getUsuarios().isEmpty()) {
            throw new BusinessException("Não é possível excluir perfil com usuários vinculados");
        }

        perfilRepository.delete(perfil);
        log.info("Perfil excluído. ID: {}", id);
    }

    /**
     * Converte List<String> de permissões para JSON String
     */
    private String serializePermissoesMenu(List<String> permissoes) {
        if (permissoes == null || permissoes.isEmpty()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(permissoes);
        } catch (Exception e) {
            log.error("Erro ao serializar permissões de menu", e);
            return null;
        }
    }

    private String serializePermissoesGranulares(Map<String, String> permissoes) {
        if (permissoes == null || permissoes.isEmpty()) {
            return null;
        }
        try {
            ObjectMapper mapper = new ObjectMapper();
            return mapper.writeValueAsString(permissoes);
        } catch (Exception e) {
            log.error("Erro ao serializar permissões granulares", e);
            return null;
        }
    }

    private List<String> extrairMenusPermitidos(Map<String, String> granulares) {
        return granulares.entrySet().stream()
                .filter(e -> e.getValue() != null && !"SEM_ACESSO".equalsIgnoreCase(e.getValue()))
                .map(Map.Entry::getKey)
                .distinct()
                .collect(Collectors.toList());
    }
}
