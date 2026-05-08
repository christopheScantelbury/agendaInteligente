package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.EmpresaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.EmpresaMapper;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmpresaService {

    private final EmpresaRepository empresaRepository;
    private final EmpresaMapper empresaMapper;
    private final ImageCompressionService imageCompressionService;
    private final UsuarioRepository usuarioRepository;
    private final UnidadeRepository unidadeRepository;

    @Transactional(readOnly = true)
    public List<EmpresaDTO> listarTodas() {
        return filtrarEmpresasPorPermissao(empresaRepository.findAll()).stream()
                .map(empresaMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EmpresaDTO> listarAtivas() {
        return filtrarEmpresasPorPermissao(empresaRepository.findByAtivoTrue()).stream()
                .map(empresaMapper::toDTO)
                .collect(Collectors.toList());
    }

    private List<Empresa> filtrarEmpresasPorPermissao(List<Empresa> empresas) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return List.of();
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuario == null) {
            return List.of();
        }
        if (Usuario.PerfilUsuario.ADMIN.equals(usuario.getPerfil())) {
            return empresas.stream()
                    .filter(e -> e.getDataExpiracaoAcesso() == null || !e.getDataExpiracaoAcesso().isBefore(LocalDate.now()))
                    .collect(Collectors.toList());
        }
        if (Usuario.PerfilUsuario.ADMINISTRADOR.equals(usuario.getPerfil())) {
            return empresas.stream()
                    .filter(e -> usuario.getId().equals(e.getAdminUnicoId()))
                    .collect(Collectors.toList());
        }
        if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
            return List.of();
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
        return empresas.stream()
                .filter(e -> empresaIds.contains(e.getId()))
                .filter(e -> e.getDataExpiracaoAcesso() == null || !e.getDataExpiracaoAcesso().isBefore(LocalDate.now()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public EmpresaDTO buscarPorId(Long id) {
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        List<Empresa> permitidas = filtrarEmpresasPorPermissao(List.of(empresa));
        if (permitidas.isEmpty()) {
            throw new ResourceNotFoundException("Empresa não encontrada");
        }
        return empresaMapper.toDTO(empresa);
    }

    @Transactional
    public EmpresaDTO criar(EmpresaDTO empresaDTO) {
        Usuario usuarioLogado = getUsuarioLogado();

        // Remover máscara do CNPJ antes de salvar
        if (empresaDTO.getCnpj() != null && !empresaDTO.getCnpj().trim().isEmpty()) {
            String cnpjSemMascara = empresaDTO.getCnpj().replaceAll("\\D", "");
            empresaDTO.setCnpj(cnpjSemMascara);
            
            // Validar CNPJ único se fornecido
            if (empresaRepository.existsByCnpj(cnpjSemMascara)) {
                throw new BusinessException("Já existe uma empresa cadastrada com este CNPJ");
            }
        }
        
        // Remover máscara do CEP antes de salvar
        if (empresaDTO.getCep() != null && !empresaDTO.getCep().trim().isEmpty()) {
            String cepSemMascara = empresaDTO.getCep().replaceAll("\\D", "");
            empresaDTO.setCep(cepSemMascara);
        }
        
        // Remover máscara do telefone antes de salvar
        if (empresaDTO.getTelefone() != null && !empresaDTO.getTelefone().trim().isEmpty()) {
            String telefoneSemMascara = empresaDTO.getTelefone().replaceAll("\\D", "");
            empresaDTO.setTelefone(telefoneSemMascara);
        }

        // Comprimir a imagem se fornecida
        if (empresaDTO.getLogo() != null && !empresaDTO.getLogo().trim().isEmpty()) {
            String compressedLogo = imageCompressionService.compressImage(empresaDTO.getLogo());
            empresaDTO.setLogo(compressedLogo);
        }

        // Valida e normaliza a cor do app
        if (empresaDTO.getCorApp() != null && !empresaDTO.getCorApp().trim().isEmpty()) {
            empresaDTO.setCorApp(validateAndNormalizeColor(empresaDTO.getCorApp()));
        }

        Empresa empresa = empresaMapper.toEntity(empresaDTO);
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            empresa.setAdminUnicoId(usuarioLogado.getId());
        }
        empresa = empresaRepository.save(empresa);
        log.info("Empresa criada. ID: {}, Nome: {}", empresa.getId(), empresa.getNome());
        return empresaMapper.toDTO(empresa);
    }

    @Transactional
    public EmpresaDTO atualizar(Long id, EmpresaDTO empresaDTO) {
        Usuario usuarioLogado = getUsuarioLogado();
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        validarAcessoAdminUnico(usuarioLogado, empresa);

        // Remover máscara do CNPJ antes de salvar
        if (empresaDTO.getCnpj() != null && !empresaDTO.getCnpj().trim().isEmpty()) {
            String cnpjSemMascara = empresaDTO.getCnpj().replaceAll("\\D", "");
            empresaDTO.setCnpj(cnpjSemMascara);
            
            // Validar CNPJ único se fornecido e diferente do atual
            empresaRepository.findByCnpj(cnpjSemMascara)
                    .ifPresent(empresaExistente -> {
                        if (!empresaExistente.getId().equals(id)) {
                            throw new BusinessException("Já existe uma empresa cadastrada com este CNPJ");
                        }
                    });
        }
        
        // Remover máscara do CEP antes de salvar
        if (empresaDTO.getCep() != null && !empresaDTO.getCep().trim().isEmpty()) {
            String cepSemMascara = empresaDTO.getCep().replaceAll("\\D", "");
            empresaDTO.setCep(cepSemMascara);
        }
        
        // Remover máscara do telefone antes de salvar
        if (empresaDTO.getTelefone() != null && !empresaDTO.getTelefone().trim().isEmpty()) {
            String telefoneSemMascara = empresaDTO.getTelefone().replaceAll("\\D", "");
            empresaDTO.setTelefone(telefoneSemMascara);
        }

        // Comprimir a imagem se fornecida
        if (empresaDTO.getLogo() != null && !empresaDTO.getLogo().trim().isEmpty()) {
            String compressedLogo = imageCompressionService.compressImage(empresaDTO.getLogo());
            empresaDTO.setLogo(compressedLogo);
        }

        // Valida e normaliza a cor do app
        if (empresaDTO.getCorApp() != null && !empresaDTO.getCorApp().trim().isEmpty()) {
            empresaDTO.setCorApp(validateAndNormalizeColor(empresaDTO.getCorApp()));
        }

        empresaMapper.updateEntityFromDTO(empresaDTO, empresa);
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            empresa.setAdminUnicoId(usuarioLogado.getId());
        }
        empresa = empresaRepository.save(empresa);
        if (usuarioLogado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            vincularUnidadesDoAdministradorNaEmpresa(usuarioLogado, empresa);
        }
        log.info("Empresa atualizada. ID: {}", id);
        return empresaMapper.toDTO(empresa);
    }

    @Transactional
    public void excluir(Long id) {
        Usuario usuarioLogado = getUsuarioLogado();
        Empresa empresa = empresaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        validarAcessoAdminUnico(usuarioLogado, empresa);

        // Verificar se tem unidades vinculadas
        if (empresa.getUnidades() != null && !empresa.getUnidades().isEmpty()) {
            throw new BusinessException("Não é possível excluir empresa com unidades vinculadas");
        }

        empresaRepository.delete(empresa);
        log.info("Empresa excluída. ID: {}", id);
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private void validarAcessoAdminUnico(Usuario usuarioLogado, Empresa empresa) {
        if (usuarioLogado.getPerfil() != Usuario.PerfilUsuario.ADMINISTRADOR) {
            return;
        }
        if (!usuarioLogado.getId().equals(empresa.getAdminUnicoId())) {
            throw new ResourceNotFoundException("Empresa não encontrada");
        }
    }

    /**
     * ADMINISTRADOR possui escopo de uma única empresa.
     * Ao salvar a empresa, garante que unidades do administrador apontem para ela.
     */
    private void vincularUnidadesDoAdministradorNaEmpresa(Usuario administrador, Empresa empresa) {
        List<Unidade> unidadesDoAdministrador = unidadeRepository.findByAdminUnicoId(administrador.getId());
        if (unidadesDoAdministrador.isEmpty()) {
            return;
        }
        boolean precisaAtualizar = unidadesDoAdministrador.stream()
                .anyMatch(u -> u.getEmpresa() == null || !empresa.getId().equals(u.getEmpresa().getId()));
        if (!precisaAtualizar) {
            return;
        }
        unidadesDoAdministrador.forEach(u -> u.setEmpresa(empresa));
        unidadeRepository.saveAll(unidadesDoAdministrador);
    }

    /**
     * Valida e normaliza a cor hexadecimal
     */
    private String validateAndNormalizeColor(String color) {
        if (color == null || color.trim().isEmpty()) {
            return null;
        }

        String normalized = color.trim().toUpperCase();

        if (normalized.startsWith("#")) {
            normalized = normalized.substring(1);
        }

        if (!normalized.matches("^[0-9A-F]{6}$")) {
            log.warn("Cor inválida: {}. Usando cor padrão.", color);
            return "#2563EB";
        }

        return "#" + normalized;
    }
}
