package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.ServicoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ServicoMapper;
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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final ServicoMapper servicoMapper;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;

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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return servicoRepository.findAll();
        }

        String email = auth.getName();
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));

        Usuario.PerfilUsuario perfil = usuario.getPerfil();

        switch (perfil) {
            case ADMIN:
                log.debug("ADMIN: listando todos os serviços");
                return servicoRepository.findAll();

            case GERENTE:
                log.debug("GERENTE: listando serviços das unidades da empresa");
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    log.warn("Gerente {} não tem unidades vinculadas", email);
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
                if (empresaIds.isEmpty()) {
                    return List.of();
                }
                return servicoRepository.findAll().stream()
                        .filter(s -> s.getUnidade() != null && s.getUnidade().getEmpresa() != null
                                && empresaIds.contains(s.getUnidade().getEmpresa().getId()))
                        .collect(Collectors.toList());

            case PROFISSIONAL:
                log.debug("PROFISSIONAL: listando serviços das unidades do usuário");
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) {
                    log.warn("Usuário {} não tem unidades vinculadas", email);
                    return List.of();
                }
                List<Long> unidadesIds = usuario.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                return servicoRepository.findAll().stream()
                        .filter(s -> s.getUnidade() != null && unidadesIds.contains(s.getUnidade().getId()))
                        .collect(Collectors.toList());

            case CLIENTE:
            default:
                log.debug("CLIENTE ou perfil desconhecido: retornando lista vazia");
                return List.of();
        }
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

    private void validarAcessoUnidade(Long unidadeId) {
        if (!obterUnidadesIdsPermitidas().contains(unidadeId)) {
            throw new BusinessException("Você não tem permissão para acessar esta unidade");
        }
    }

    @Transactional(readOnly = true)
    public ServicoDTO buscarPorId(Long id) {
        log.debug("Buscando serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        if (servico.getUnidade() == null || !obterUnidadesIdsPermitidas().contains(servico.getUnidade().getId())) {
            throw new ResourceNotFoundException("Serviço não encontrado com id: " + id);
        }
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO criar(ServicoDTO servicoDTO) {
        log.debug("Criando novo serviço: {}", servicoDTO);
        
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
        servico = servicoRepository.save(servico);
        log.info("Serviço criado com sucesso. ID: {}, Unidade: {}", servico.getId(), unidade.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO atualizar(Long id, ServicoDTO servicoDTO) {
        log.debug("Atualizando serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));

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
        servico = servicoRepository.save(servico);
        log.info("Serviço atualizado com sucesso. ID: {}", servico.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public void excluir(Long id) {
        log.debug("Excluindo serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        if (servico.getUnidade() == null || !obterUnidadesIdsPermitidas().contains(servico.getUnidade().getId())) {
            throw new ResourceNotFoundException("Serviço não encontrado com id: " + id);
        }
        servicoRepository.deleteById(id);
        log.info("Serviço excluído com sucesso. ID: {}", id);
    }
}

