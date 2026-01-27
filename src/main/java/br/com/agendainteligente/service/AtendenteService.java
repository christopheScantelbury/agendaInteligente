package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Empresa;
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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
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
        List<Atendente> atendentes = filtrarPorPermissao();
        return atendentes.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Filtra atendentes baseado no perfil e empresas do usuário logado.
     * - ADMIN: vê todos os atendentes
     * - GERENTE: vê apenas atendentes das unidades da mesma empresa
     * - PROFISSIONAL: vê apenas atendentes da mesma unidade
     * - CLIENTE: não deve acessar esta funcionalidade
     */
    private List<Atendente> filtrarPorPermissao() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Tentativa de listar atendentes sem autenticação");
            return atendenteRepository.findAll();
        }

        String email = auth.getName();
        Usuario usuarioLogado = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        Usuario.PerfilUsuario perfil = usuarioLogado.getPerfil();

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os atendentes");
                return atendenteRepository.findAll();

            case GERENTE:
                log.debug("GERENTE: listando atendentes das unidades da mesma empresa");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
                    return List.of();
                }
                
                // Obter IDs das empresas das unidades do gerente
                Set<Long> empresaIds = usuarioLogado.getUnidades().stream()
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
                
                // Retornar atendentes das unidades da mesma empresa
                List<Atendente> todosAtendentes = atendenteRepository.findAll();
                List<Atendente> atendentesFiltrados = todosAtendentes.stream()
                        .filter(a -> unidadesIds.contains(a.getUnidade().getId()))
                        .collect(Collectors.toList());
                
                log.debug("Gerente {} pode ver {} atendentes de {} total", email, atendentesFiltrados.size(), todosAtendentes.size());
                return atendentesFiltrados;

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando apenas atendentes da mesma unidade");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Profissional {} não tem unidades vinculadas", email);
                    return List.of();
                }
                
                // Obter IDs das unidades do profissional
                List<Long> unidadesProfissionalIds = usuarioLogado.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                
                // Retornar atendentes das mesmas unidades
                return atendenteRepository.findAll().stream()
                        .filter(a -> unidadesProfissionalIds.contains(a.getUnidade().getId()))
                        .collect(Collectors.toList());

            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia");
                return List.of();
        }
    }

    private boolean podeAcessarAtendente(Atendente atendente) {
        if (atendente == null || atendente.getUnidade() == null) {
            return false;
        }
        return obterUnidadesIdsPermitidas().contains(atendente.getUnidade().getId());
    }

    private Set<Long> obterUnidadesIdsPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Set.of();
        }
        Usuario usuarioLogado = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuarioLogado == null) {
            return Set.of();
        }
        switch (usuarioLogado.getPerfil()) {
            case ADMIN:
                return unidadeRepository.findAll().stream().map(Unidade::getId).collect(Collectors.toSet());
            case GERENTE:
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    return Set.of();
                }
                Set<Long> empresaIds = usuarioLogado.getUnidades().stream()
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
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    return Set.of();
                }
                return usuarioLogado.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default:
                return Set.of();
        }
    }

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarAtivos() {
        return filtrarPorPermissao().stream()
                .filter(Atendente::getAtivo)
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarPorUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            return List.of();
        }
        return atendenteRepository.findByUnidadeIdAndAtivoTrue(unidadeId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AtendenteDTO> listarPorUnidadeEServicos(Long unidadeId, List<Long> servicosIds) {
        log.debug("Listando atendentes da unidade {} que prestam os serviços {}", unidadeId, servicosIds);
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            return List.of();
        }
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
        normalizeAtendenteDTO(atendenteDTO);
        if (!obterUnidadesIdsPermitidas().contains(atendenteDTO.getUnidadeId())) {
            throw new ResourceNotFoundException("Unidade não encontrada");
        }
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
        
        // Define percentual de comissão se fornecido
        if (atendenteDTO.getPercentualComissao() != null) {
            atendente.setPercentualComissao(atendenteDTO.getPercentualComissao());
        }
        
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
        normalizeAtendenteDTO(atendenteDTO);
        Atendente atendente = atendenteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        if (!podeAcessarAtendente(atendente)) {
            throw new ResourceNotFoundException("Atendente não encontrado");
        }
        if (!obterUnidadesIdsPermitidas().contains(atendenteDTO.getUnidadeId())) {
            throw new ResourceNotFoundException("Unidade não encontrada");
        }
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
        atendente.setPercentualComissao(
            atendenteDTO.getPercentualComissao() != null 
                ? atendenteDTO.getPercentualComissao() 
                : java.math.BigDecimal.ZERO
        );
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
        Atendente atendente = atendenteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));
        if (!podeAcessarAtendente(atendente)) {
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

