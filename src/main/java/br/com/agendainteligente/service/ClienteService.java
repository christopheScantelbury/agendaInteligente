package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.mapper.ClienteMapper;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;
    private final UnidadeMapper unidadeMapper;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;
    private final PasswordEncoder passwordEncoder;
    
    private static final Pattern ONLY_DIGITS = Pattern.compile("\\D");

    @Transactional(readOnly = true)
    public List<ClienteDTO> listarTodos() {
        log.debug("Listando clientes com filtro de permissão");
        List<Cliente> clientes = filtrarPorPermissao();
        return clientes.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Filtra clientes baseado no perfil e empresas do usuário logado.
     * - ADMIN: vê todos os clientes
     * - GERENTE: vê apenas clientes das unidades da mesma empresa
     * - PROFISSIONAL: vê apenas clientes da mesma unidade
     * - CLIENTE: não deve acessar esta funcionalidade
     */
    private List<Cliente> filtrarPorPermissao() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            log.warn("Tentativa de listar clientes sem autenticação");
            return clienteRepository.findAll();
        }

        String email = auth.getName();
        Usuario usuarioLogado = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        Usuario.PerfilUsuario perfil = usuarioLogado.getPerfil();

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os clientes");
                return clienteRepository.findAll();

            case GERENTE:
                log.debug("GERENTE: listando clientes das unidades da mesma empresa");
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
                
                // Retornar clientes das unidades da mesma empresa
                List<Cliente> todosClientes = clienteRepository.findAll();
                List<Cliente> clientesFiltrados = todosClientes.stream()
                        .filter(c -> c.getUnidade() != null && unidadesIds.contains(c.getUnidade().getId()))
                        .collect(Collectors.toList());
                
                log.debug("Gerente {} pode ver {} clientes de {} total", email, clientesFiltrados.size(), todosClientes.size());
                return clientesFiltrados;

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando apenas clientes da mesma unidade");
                if (usuarioLogado.getUnidades() == null || usuarioLogado.getUnidades().isEmpty()) {
                    log.warn("Profissional {} não tem unidades vinculadas", email);
                    return List.of();
                }
                
                // Obter IDs das unidades do profissional
                List<Long> unidadesProfissionalIds = usuarioLogado.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                
                // Retornar clientes das mesmas unidades
                return clienteRepository.findAll().stream()
                        .filter(c -> c.getUnidade() != null && unidadesProfissionalIds.contains(c.getUnidade().getId()))
                        .collect(Collectors.toList());

            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia");
                return List.of();
        }
    }

    private boolean podeAcessarCliente(Cliente cliente) {
        if (cliente == null || cliente.getUnidade() == null) {
            return false;
        }
        return obterUnidadesIdsPermitidas().contains(cliente.getUnidade().getId());
    }

    private Set<Long> obterUnidadesIdsPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return Set.of();
        }
        Usuario usuarioLogado = usuarioRepository.findByEmail(auth.getName())
                .orElse(null);
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
    public ClienteDTO buscarPorId(Long id) {
        log.debug("Buscando cliente com id: {}", id);
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + id));
        if (!podeAcessarCliente(cliente)) {
            throw new ResourceNotFoundException("Cliente não encontrado com id: " + id);
        }
        return toDTO(cliente);
    }

    @Transactional(readOnly = true)
    public ClienteDTO buscarPorCpfCnpj(String cpfCnpj) {
        log.debug("Buscando cliente com CPF/CNPJ: {}", cpfCnpj);
        Cliente cliente = clienteRepository.findByCpfCnpj(cpfCnpj)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com CPF/CNPJ: " + cpfCnpj));
        if (!podeAcessarCliente(cliente)) {
            throw new ResourceNotFoundException("Cliente não encontrado com CPF/CNPJ: " + cpfCnpj);
        }
        return clienteMapper.toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public ClienteDTO criar(ClienteDTO clienteDTO) {
        log.debug("Criando novo cliente: {}", clienteDTO);
        
        // Remover máscaras antes de validar e salvar
        normalizeClienteDTO(clienteDTO);
        
        if (clienteRepository.existsByCpfCnpj(clienteDTO.getCpfCnpj())) {
            throw new BusinessException("Já existe um cliente cadastrado com este CPF/CNPJ");
        }
        
        // Verificar se já existe usuário com o email
        if (clienteDTO.getEmail() != null && !clienteDTO.getEmail().trim().isEmpty()) {
            if (usuarioRepository.existsByEmail(clienteDTO.getEmail())) {
                throw new BusinessException("Já existe um usuário cadastrado com este email");
            }
        }
        
        Cliente cliente = clienteMapper.toEntity(clienteDTO);
        
        // Buscar e associar unidade principal
        if (clienteDTO.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(clienteDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada com id: " + clienteDTO.getUnidadeId()));
            if (!unidade.getAtivo()) {
                throw new BusinessException("Unidade não está ativa");
            }
            cliente.setUnidade(unidade);
        } else {
            throw new BusinessException("Unidade é obrigatória para criar um cliente");
        }
        
        // Associar unidades adicionais ao cliente (além da principal)
        if (clienteDTO.getUnidadesIds() != null && !clienteDTO.getUnidadesIds().isEmpty()) {
            List<Unidade> unidades = unidadeRepository.findAllById(clienteDTO.getUnidadesIds());
            if (unidades.size() != clienteDTO.getUnidadesIds().size()) {
                throw new BusinessException("Uma ou mais unidades informadas não foram encontradas");
            }
            cliente.setUnidades(unidades);
        }
        
        cliente = clienteRepository.save(cliente);
        
        // Criar usuário automaticamente para o cliente se tiver email e senha
        if (clienteDTO.getEmail() != null && !clienteDTO.getEmail().trim().isEmpty() 
            && clienteDTO.getSenha() != null && !clienteDTO.getSenha().trim().isEmpty()) {
            try {
                Usuario usuario = Usuario.builder()
                    .nome(cliente.getNome())
                    .email(cliente.getEmail())
                    .senha(passwordEncoder.encode(clienteDTO.getSenha()))
                    .perfilSistema(Usuario.PerfilUsuario.CLIENTE)
                    .ativo(cliente.getAtivo())
                    .build();
                
                usuario = usuarioRepository.save(usuario);
                log.info("Usuário criado automaticamente para cliente. Cliente ID: {}, Usuário ID: {}", 
                    cliente.getId(), usuario.getId());
            } catch (Exception e) {
                log.warn("Erro ao criar usuário para cliente ID: {}. Erro: {}", cliente.getId(), e.getMessage());
                // Não falha o cadastro do cliente se houver erro ao criar usuário
            }
        }
        
        log.info("Cliente criado com sucesso. ID: {}", cliente.getId());
        return toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public ClienteDTO atualizar(Long id, ClienteDTO clienteDTO) {
        log.debug("Atualizando cliente com id: {}", id);
        
        // Remover máscaras antes de validar e salvar
        normalizeClienteDTO(clienteDTO);
        
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + id));
        if (!podeAcessarCliente(cliente)) {
            throw new ResourceNotFoundException("Cliente não encontrado com id: " + id);
        }
        
        if (!cliente.getCpfCnpj().equals(clienteDTO.getCpfCnpj()) 
                && clienteRepository.existsByCpfCnpj(clienteDTO.getCpfCnpj())) {
            throw new BusinessException("Já existe outro cliente cadastrado com este CPF/CNPJ");
        }
        
        clienteMapper.updateEntityFromDTO(clienteDTO, cliente);
        
        // Atualizar unidade principal
        if (clienteDTO.getUnidadeId() != null) {
            Unidade unidade = unidadeRepository.findById(clienteDTO.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada com id: " + clienteDTO.getUnidadeId()));
            if (!unidade.getAtivo()) {
                throw new BusinessException("Unidade não está ativa");
            }
            cliente.setUnidade(unidade);
        }
        
        // Atualizar unidades adicionais do cliente
        if (clienteDTO.getUnidadesIds() != null) {
            if (clienteDTO.getUnidadesIds().isEmpty()) {
                cliente.setUnidades(List.of());
            } else {
                List<Unidade> unidades = unidadeRepository.findAllById(clienteDTO.getUnidadesIds());
                if (unidades.size() != clienteDTO.getUnidadesIds().size()) {
                    throw new BusinessException("Uma ou mais unidades informadas não foram encontradas");
                }
                cliente.setUnidades(unidades);
            }
        }
        
        cliente = clienteRepository.save(cliente);
        log.info("Cliente atualizado com sucesso. ID: {}", cliente.getId());
        return toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public void excluir(Long id) {
        log.debug("Excluindo cliente com id: {}", id);
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + id));
        if (!podeAcessarCliente(cliente)) {
            throw new ResourceNotFoundException("Cliente não encontrado com id: " + id);
        }
        clienteRepository.deleteById(id);
        log.info("Cliente excluído com sucesso. ID: {}", id);
    }

    /**
     * Remove máscaras de campos como CPF/CNPJ, telefone, CEP e número.
     */
    private void normalizeClienteDTO(ClienteDTO clienteDTO) {
        if (clienteDTO.getCpfCnpj() != null && !clienteDTO.getCpfCnpj().trim().isEmpty()) {
            String cpfCnpjNormalizado = ONLY_DIGITS.matcher(clienteDTO.getCpfCnpj()).replaceAll("");
            // Limitar a 14 caracteres (tamanho máximo do campo no banco - aceita CPF 11 ou CNPJ 14)
            clienteDTO.setCpfCnpj(cpfCnpjNormalizado.length() > 14 ? cpfCnpjNormalizado.substring(0, 14) : cpfCnpjNormalizado);
        }
        if (clienteDTO.getTelefone() != null && !clienteDTO.getTelefone().trim().isEmpty()) {
            String telefoneNormalizado = ONLY_DIGITS.matcher(clienteDTO.getTelefone()).replaceAll("");
            // Limitar a 20 caracteres (tamanho máximo do campo no banco)
            clienteDTO.setTelefone(telefoneNormalizado.length() > 20 ? telefoneNormalizado.substring(0, 20) : telefoneNormalizado);
        }
        if (clienteDTO.getCep() != null && !clienteDTO.getCep().trim().isEmpty()) {
            String cepNormalizado = ONLY_DIGITS.matcher(clienteDTO.getCep()).replaceAll("");
            // Limitar a 8 caracteres (tamanho máximo do campo no banco)
            clienteDTO.setCep(cepNormalizado.length() > 8 ? cepNormalizado.substring(0, 8) : cepNormalizado);
        }
        if (clienteDTO.getNumero() != null && !clienteDTO.getNumero().trim().isEmpty()) {
            String numeroNormalizado = ONLY_DIGITS.matcher(clienteDTO.getNumero()).replaceAll("");
            // Limitar a 10 caracteres (tamanho máximo do campo no banco)
            clienteDTO.setNumero(numeroNormalizado.length() > 10 ? numeroNormalizado.substring(0, 10) : numeroNormalizado);
        }
    }
    
    /**
     * Converte Cliente para ClienteDTO, populando a lista de unidades como objetos UnidadeDTO
     */
    private ClienteDTO toDTO(Cliente cliente) {
        ClienteDTO dto = clienteMapper.toDTO(cliente);
        
        // Popular lista de unidades como objetos UnidadeDTO
        if (cliente.getUnidades() != null && !cliente.getUnidades().isEmpty()) {
            List<UnidadeDTO> unidadesDTO = cliente.getUnidades().stream()
                    .map(unidadeMapper::toDTO)
                    .collect(Collectors.toList());
            dto.setUnidades(unidadesDTO);
            
            // Também popular unidadesIds para compatibilidade
            dto.setUnidadesIds(cliente.getUnidades().stream()
                    .map(Unidade::getId)
                    .collect(Collectors.toList()));
        }
        
        return dto;
    }
}

