package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UnidadeService {

    private final UnidadeRepository unidadeRepository;
    private final UnidadeMapper unidadeMapper;
    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final AtendenteRepository atendenteRepository;

    private static final Pattern ONLY_DIGITS = Pattern.compile("\\D");

    @Transactional(readOnly = true)
    public List<UnidadeDTO> listarTodos() {
        List<Unidade> unidades = filtrarPorPermissao();
        return unidades.stream()
                .map(unidadeMapper::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Filtra unidades baseado no perfil e empresas do usuário logado.
     * - ADMIN: vê todas as unidades
     * - GERENTE: vê apenas unidades das empresas vinculadas
     * - PROFISSIONAL: vê apenas suas unidades
     * - CLIENTE: vê apenas suas unidades
     */
    private List<Unidade> filtrarPorPermissao() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Tentativa de listar unidades sem autenticação");
            return unidadeRepository.findAll();
        }

        String email = auth.getName();
        Usuario usuarioLogado = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        Usuario.PerfilUsuario perfil = usuarioLogado.getPerfil();

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todas as unidades");
                return unidadeRepository.findAll();
            case ADMINISTRADOR:
                log.debug("ADMINISTRADOR: listando unidades próprias (admin_unico_id={})", usuarioLogado.getId());
                return unidadeRepository.findByAdminUnicoId(usuarioLogado.getId());

            case GERENTE:
                log.debug("GERENTE: listando apenas unidades vinculadas ao gerente");
                List<Unidade> unidadesGerente = safeGetUnidadesUsuario(usuarioLogado);
                if (unidadesGerente.isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return List.of();
                }
                return unidadesGerente;

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando apenas unidades do atendente");
                List<Unidade> unidadesProf = safeGetUnidadesUsuario(usuarioLogado);
                if (unidadesProf.isEmpty()) {
                    unidadesProf = atendenteRepository.findByUsuarioId(usuarioLogado.getId())
                            .map(a -> a.getUnidade() != null ? List.<Unidade>of(a.getUnidade()) : List.<Unidade>of())
                            .orElse(List.of());
                }
                if (unidadesProf.isEmpty()) {
                    log.warn("Profissional {} não tem unidade vinculada", email);
                    return List.of();
                }
                return unidadesProf;

            case CLIENTE:
                log.debug("CLIENTE: listando apenas unidades do cliente");
                List<Unidade> unidadesCliente = clienteRepository.findByEmail(email)
                        .map(c -> {
                            Set<Unidade> set = new LinkedHashSet<>();
                            if (c.getUnidade() != null) set.add(c.getUnidade());
                            if (c.getUnidades() != null) set.addAll(c.getUnidades());
                            return List.<Unidade>copyOf(set);
                        })
                        .orElse(List.of());
                if (unidadesCliente.isEmpty()) {
                    log.warn("Cliente {} não tem unidade vinculada", email);
                    return List.of();
                }
                return unidadesCliente;

            default:
                log.debug("Perfil desconhecido: retornando lista vazia");
                return List.of();
        }
    }

    @Transactional(readOnly = true)
    public List<UnidadeDTO> listarAtivas() {
        return filtrarPorPermissao().stream()
                .filter(Unidade::getAtivo)
                .map(unidadeMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UnidadeDTO buscarPorId(Long id) {
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        List<Unidade> permitidas = filtrarPorPermissao();
        boolean podeAcessar = permitidas.stream().anyMatch(u -> u.getId().equals(id));
        if (!podeAcessar) {
            throw new ResourceNotFoundException("Unidade não encontrada");
        }
        return unidadeMapper.toDTO(unidade);
    }

    @Transactional
    public UnidadeDTO criar(UnidadeDTO unidadeDTO) {
        Usuario usuarioLogado = getUsuarioLogado();

        // Remover máscaras antes de validar e salvar
        normalizeUnidadeDTO(unidadeDTO);

        // Validar empresa
        if (unidadeDTO.getEmpresaId() == null) {
            throw new BusinessException("Empresa é obrigatória para criar uma unidade");
        }
        
        Empresa empresa = empresaRepository.findById(unidadeDTO.getEmpresaId())
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        validarAcessoEmpresaDoAdminUnico(usuarioLogado, empresa);
        
        Unidade unidade = unidadeMapper.toEntity(unidadeDTO);
        unidade.setEmpresa(empresa);
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            unidade.setAdminUnicoId(usuarioLogado.getId());
        }
        unidade = unidadeRepository.save(unidade);
        log.info("Unidade criada. ID: {}, Nome: {}, Empresa: {}", unidade.getId(), unidade.getNome(), empresa.getNome());
        return unidadeMapper.toDTO(unidade);
    }

    @Transactional
    public UnidadeDTO atualizar(Long id, UnidadeDTO unidadeDTO) {
        Usuario usuarioLogado = getUsuarioLogado();
        Unidade unidade = unidadeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        validarAcessoUnidadeDoAdminUnico(usuarioLogado, unidade);

        // Remover máscaras antes de validar e salvar
        normalizeUnidadeDTO(unidadeDTO);
        
        // Atualizar empresa se fornecido
        if (unidadeDTO.getEmpresaId() != null && !unidadeDTO.getEmpresaId().equals(unidade.getEmpresa().getId())) {
            Empresa empresa = empresaRepository.findById(unidadeDTO.getEmpresaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
            validarAcessoEmpresaDoAdminUnico(usuarioLogado, empresa);
            unidade.setEmpresa(empresa);
        }
        
        unidadeMapper.updateEntityFromDTO(unidadeDTO, unidade);
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            unidade.setAdminUnicoId(usuarioLogado.getId());
        }
        unidade = unidadeRepository.save(unidade);
        log.info("Unidade atualizada. ID: {}", id);
        return unidadeMapper.toDTO(unidade);
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private void validarAcessoEmpresaDoAdminUnico(Usuario usuarioLogado, Empresa empresa) {
        if (usuarioLogado.getPerfil() != Usuario.PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        if (!usuarioLogado.getId().equals(empresa.getAdminUnicoId())) {
            throw new ResourceNotFoundException("Empresa não encontrada");
        }
    }

    private void validarAcessoUnidadeDoAdminUnico(Usuario usuarioLogado, Unidade unidade) {
        if (usuarioLogado.getPerfil() != Usuario.PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        if (!usuarioLogado.getId().equals(unidade.getAdminUnicoId())) {
            throw new ResourceNotFoundException("Unidade não encontrada");
        }
    }

    /**
     * Obtém as unidades do usuário de forma segura (evita LazyInitializationException).
     * Retorna lista vazia se o usuário não tiver unidades ou em caso de falha ao acessar a relação.
     */
    private List<Unidade> safeGetUnidadesUsuario(Usuario usuario) {
        if (usuario == null) return List.of();
        try {
            List<Unidade> list = usuario.getUnidades();
            return (list != null && !list.isEmpty()) ? list : List.of();
        } catch (Exception e) {
            log.debug("Não foi possível obter unidades do usuário (pode ser LazyInit): {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Remove máscaras de campos como CEP, telefone e número.
     */
    private void normalizeUnidadeDTO(UnidadeDTO unidadeDTO) {
        if (unidadeDTO.getCep() != null && !unidadeDTO.getCep().trim().isEmpty()) {
            String cepNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getCep()).replaceAll("");
            // Limitar a 8 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setCep(cepNormalizado.length() > 8 ? cepNormalizado.substring(0, 8) : cepNormalizado);
        }
        if (unidadeDTO.getTelefone() != null && !unidadeDTO.getTelefone().trim().isEmpty()) {
            String telefoneNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getTelefone()).replaceAll("");
            // Limitar a 20 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setTelefone(telefoneNormalizado.length() > 20 ? telefoneNormalizado.substring(0, 20) : telefoneNormalizado);
        }
        if (unidadeDTO.getNumero() != null && !unidadeDTO.getNumero().trim().isEmpty()) {
            String numeroNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getNumero()).replaceAll("");
            // Limitar a 10 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setNumero(numeroNormalizado.length() > 10 ? numeroNormalizado.substring(0, 10) : numeroNormalizado);
        }
        if (unidadeDTO.getCnpj() != null && !unidadeDTO.getCnpj().trim().isEmpty()) {
            String cnpjNormalizado = ONLY_DIGITS.matcher(unidadeDTO.getCnpj()).replaceAll("");
            // Limitar a 14 caracteres (tamanho máximo do campo no banco)
            unidadeDTO.setCnpj(cnpjNormalizado.length() > 14 ? cnpjNormalizado.substring(0, 14) : cnpjNormalizado);
        }
    }
}
