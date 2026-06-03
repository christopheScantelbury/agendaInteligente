package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Anamnese;
import br.com.agendainteligente.domain.entity.AnamneseTemplate;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.AnamneseDTO;
import br.com.agendainteligente.dto.AnamneseResumoDTO;
import br.com.agendainteligente.dto.AnamneseTemplateDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.AnamneseRepository;
import br.com.agendainteligente.repository.AnamneseTemplateRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.agendainteligente.exception.BusinessException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnamneseService {

    private final AnamneseRepository anamneseRepository;
    private final AnamneseTemplateRepository anamneseTemplateRepository;
    private final ClienteRepository clienteRepository;
    private final ServicoRepository servicoRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional(readOnly = true)
    public List<AnamneseResumoDTO> listar(Long unidadeId, Long clienteId) {
        // SEC: filtrar por unidades permitidas pro usuário logado
        java.util.Set<Long> unidadesPermitidas = obterUnidadesIdsPermitidas();
        List<Anamnese> anamneses;
        if (clienteId != null && unidadeId != null) {
            anamneses = anamneseRepository.findByClienteIdAndUnidadeIdOrderByDataDesc(clienteId, unidadeId);
        } else if (clienteId != null) {
            anamneses = anamneseRepository.findByClienteIdOrderByDataDesc(clienteId);
        } else if (unidadeId != null) {
            anamneses = anamneseRepository.findByUnidadeIdOrderByDataDesc(unidadeId);
        } else {
            anamneses = anamneseRepository.findAll();
        }
        // Filtro tenant: ADMIN global vê tudo (null), demais filtram por unidades permitidas
        if (unidadesPermitidas != null) {
            anamneses = anamneses.stream()
                    .filter(a -> a.getUnidade() != null && unidadesPermitidas.contains(a.getUnidade().getId()))
                    .collect(Collectors.toList());
        }
        return anamneses.stream().map(this::toResumoDTO).collect(Collectors.toList());
    }

    /**
     * Conjunto de unidadeIds que o usuário logado pode acessar.
     * `null` = ADMIN global (sem filtro).
     * Vazio = sem acesso a nada (logado mas sem vínculo).
     */
    private java.util.Set<Long> obterUnidadesIdsPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return java.util.Set.of();
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuario == null) return java.util.Set.of();
        switch (usuario.getPerfil()) {
            case ADMIN:
                return null; // sem filtro
            case ADMINISTRADOR:
                Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
                return unidadeRepository.findByAdminUnicoId(adminId).stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
            case GERENTE:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) return java.util.Set.of();
                java.util.Set<Long> empresaIds = usuario.getUnidades().stream()
                        .map(u -> u.getEmpresa() != null ? u.getEmpresa().getId() : null)
                        .filter(id -> id != null)
                        .collect(Collectors.toSet());
                if (empresaIds.isEmpty()) return java.util.Set.of();
                return unidadeRepository.findAll().stream()
                        .filter(u -> u.getEmpresa() != null && empresaIds.contains(u.getEmpresa().getId()))
                        .map(Unidade::getId)
                        .collect(Collectors.toSet());
            case PROFISSIONAL:
                if (usuario.getUnidades() == null || usuario.getUnidades().isEmpty()) return java.util.Set.of();
                return usuario.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default:
                return java.util.Set.of();
        }
    }

    @Transactional(readOnly = true)
    public AnamneseDTO buscarPorId(Long id) {
        Anamnese anamnese = anamneseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anamnese não encontrada com id: " + id));
        return toDTO(anamnese);
    }

    @Transactional
    public AnamneseDTO salvar(AnamneseDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.getClienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + dto.getClienteId()));

        Servico servico = null;
        if (dto.getServicoId() != null) {
            servico = servicoRepository.findById(dto.getServicoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + dto.getServicoId()));
        }

        AnamneseTemplate template = null;
        if (dto.getTemplateId() != null) {
            template = anamneseTemplateRepository.findById(dto.getTemplateId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado com id: " + dto.getTemplateId()));
        }

        Unidade unidade = resolverUnidadeDoUsuarioLogado();

        Anamnese anamnese = Anamnese.builder()
                .cliente(cliente)
                .servico(servico)
                .servicoNome(dto.getServicoNome())
                .template(template)
                .data(dto.getData())
                .usaRimel(dto.getUsaRimel())
                .usaRimelObs(dto.getUsaRimelObs())
                .procedimentosRecentesOlhos(dto.getProcedimentosRecentesOlhos())
                .procedimentosRecentesOlhosObs(dto.getProcedimentosRecentesOlhosObs())
                .alergias(dto.getAlergias())
                .alergiasObs(dto.getAlergiasObs())
                .problemasOculares(dto.getProblemasOculares())
                .problemasOcularesObs(dto.getProblemasOcularesObs())
                .tratamentoOncologico(dto.getTratamentoOncologico())
                .tratamentoOncologicoObs(dto.getTratamentoOncologicoObs())
                .tireoide(dto.getTireoide())
                .tireoidedObs(dto.getTireoidedObs())
                .dormeDeLado(dto.getDormeDeLado())
                .dormeDeLadoObs(dto.getDormeDeLadoObs())
                .gravidez(dto.getGravidez())
                .gravidezObs(dto.getGravidezObs())
                .outrosProblemas(dto.getOutrosProblemas())
                .outrosProblemasDescricao(dto.getOutrosProblemasDescricao())
                .mapping(dto.getMapping())
                .marcaFios(dto.getMarcaFios())
                .espessura(dto.getEspessura())
                .curvatura(dto.getCurvatura())
                .adesivo(dto.getAdesivo())
                .usoImagem(dto.getUsoImagem() != null ? dto.getUsoImagem() : false)
                .observacoes(dto.getObservacoes())
                .unidade(unidade)
                .build();

        if (dto.getRespostas() != null && !dto.getRespostas().isEmpty()) {
            anamnese.setRespostas(dto.getRespostas());
        }

        anamnese = anamneseRepository.save(anamnese);
        log.info("Anamnese criada com sucesso. ID: {}", anamnese.getId());
        return toDTO(anamnese);
    }

    @Transactional
    public void excluir(Long id) {
        Anamnese anamnese = anamneseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anamnese não encontrada com id: " + id));
        anamneseRepository.delete(anamnese);
        log.info("Anamnese excluída com sucesso. ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<AnamneseTemplateDTO> listarTemplatesAtivos() {
        Usuario logado = getUsuarioLogado();
        // ADMIN global vê tudo; demais perfis veem só globais (NULL) + próprios
        if (logado.getPerfil() == Usuario.PerfilUsuario.ADMIN) {
            return anamneseTemplateRepository.findByAtivoTrueOrderByNomeAsc().stream()
                    .map(this::toTemplateDTO)
                    .collect(Collectors.toList());
        }
        Long adminUnicoId = logado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                ? logado.getId() : logado.getAdminUnicoId();
        return anamneseTemplateRepository.findVisiveisPorAdmin(adminUnicoId).stream()
                .map(this::toTemplateDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AnamneseTemplateDTO buscarTemplatePorId(Long id) {
        AnamneseTemplate t = anamneseTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"));
        validarAcessoTemplate(t);
        return toTemplateDTO(t);
    }

    private void validarAcessoTemplate(AnamneseTemplate t) {
        Usuario logado = getUsuarioLogado();
        if (logado.getPerfil() == Usuario.PerfilUsuario.ADMIN) return;
        // Globais (NULL) são acessíveis por todos
        if (t.getAdminUnicoId() == null) return;
        Long adminUnicoId = logado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                ? logado.getId() : logado.getAdminUnicoId();
        if (!t.getAdminUnicoId().equals(adminUnicoId)) {
            throw new ResourceNotFoundException("Template não encontrado");
        }
    }

    @Transactional
    public AnamneseTemplateDTO salvarTemplate(AnamneseTemplateDTO dto) {
        AnamneseTemplate template;
        if (dto.getId() != null) {
            template = anamneseTemplateRepository.findById(dto.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"));
            // Bloqueia edição de templates globais (NULL) por não-ADMIN e cross-tenant
            Usuario logadoCheck = getUsuarioLogado();
            if (template.getAdminUnicoId() == null
                    && logadoCheck.getPerfil() != Usuario.PerfilUsuario.ADMIN) {
                throw new BusinessException("Templates padrão do sistema não podem ser editados");
            }
            validarAcessoTemplate(template);
        } else {
            template = new AnamneseTemplate();
        }
        template.setNome(dto.getNome());
        template.setDescricao(dto.getDescricao());
        template.setAtivo(dto.getAtivo() != null ? dto.getAtivo() : true);
        if (dto.getUnidadeId() != null) {
            template.setUnidade(unidadeRepository.findById(dto.getUnidadeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada")));
        }
        Usuario logado = getUsuarioLogado();
        Long adminUnicoId = logado.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                ? logado.getId() : logado.getAdminUnicoId();
        template.setAdminUnicoId(adminUnicoId);
        // Converte List<Pergunta DTO> em List<Map<String,Object>> para persistência JSONB
        if (dto.getPerguntas() != null) {
            template.setPerguntas(dto.getPerguntas().stream()
                    .map(p -> objectMapper.convertValue(p, new TypeReference<java.util.Map<String, Object>>() {}))
                    .collect(java.util.stream.Collectors.toList()));
        } else {
            template.setPerguntas(null);
        }
        return toTemplateDTO(anamneseTemplateRepository.save(template));
    }

    @Transactional
    public void inativarTemplate(Long id) {
        AnamneseTemplate template = anamneseTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"));
        Usuario logado = getUsuarioLogado();
        if (template.getAdminUnicoId() == null
                && logado.getPerfil() != Usuario.PerfilUsuario.ADMIN) {
            throw new BusinessException("Templates padrão do sistema não podem ser inativados");
        }
        validarAcessoTemplate(template);
        template.setAtivo(false);
        anamneseTemplateRepository.save(template);
    }

    private AnamneseTemplateDTO toTemplateDTO(AnamneseTemplate t) {
        List<AnamneseTemplateDTO.Pergunta> perguntas = null;
        if (t.getPerguntas() != null && !t.getPerguntas().isEmpty()) {
            perguntas = t.getPerguntas().stream()
                    .map(m -> objectMapper.convertValue(m, AnamneseTemplateDTO.Pergunta.class))
                    .collect(Collectors.toList());
        }
        return AnamneseTemplateDTO.builder()
                .id(t.getId())
                .nome(t.getNome())
                .descricao(t.getDescricao())
                .ativo(t.getAtivo())
                .unidadeId(t.getUnidade() != null ? t.getUnidade().getId() : null)
                .perguntas(perguntas)
                .build();
    }

    private Usuario getUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private AnamneseDTO toDTO(Anamnese a) {
        return AnamneseDTO.builder()
                .id(a.getId())
                .clienteId(a.getCliente() != null ? a.getCliente().getId() : null)
                .clienteNome(a.getCliente() != null ? a.getCliente().getNome() : null)
                .servicoId(a.getServico() != null ? a.getServico().getId() : null)
                .servicoNome(a.getServico() != null ? a.getServico().getNome() : a.getServicoNome())
                .templateId(a.getTemplate() != null ? a.getTemplate().getId() : null)
                .templateNome(a.getTemplate() != null ? a.getTemplate().getNome() : null)
                .data(a.getData())
                .usaRimel(a.getUsaRimel())
                .usaRimelObs(a.getUsaRimelObs())
                .procedimentosRecentesOlhos(a.getProcedimentosRecentesOlhos())
                .procedimentosRecentesOlhosObs(a.getProcedimentosRecentesOlhosObs())
                .alergias(a.getAlergias())
                .alergiasObs(a.getAlergiasObs())
                .problemasOculares(a.getProblemasOculares())
                .problemasOcularesObs(a.getProblemasOcularesObs())
                .tratamentoOncologico(a.getTratamentoOncologico())
                .tratamentoOncologicoObs(a.getTratamentoOncologicoObs())
                .tireoide(a.getTireoide())
                .tireoidedObs(a.getTireoidedObs())
                .dormeDeLado(a.getDormeDeLado())
                .dormeDeLadoObs(a.getDormeDeLadoObs())
                .gravidez(a.getGravidez())
                .gravidezObs(a.getGravidezObs())
                .outrosProblemas(a.getOutrosProblemas())
                .outrosProblemasDescricao(a.getOutrosProblemasDescricao())
                .mapping(a.getMapping())
                .marcaFios(a.getMarcaFios())
                .espessura(a.getEspessura())
                .curvatura(a.getCurvatura())
                .adesivo(a.getAdesivo())
                .usoImagem(a.getUsoImagem())
                .observacoes(a.getObservacoes())
                .respostas(a.getRespostas())
                .unidadeId(a.getUnidade() != null ? a.getUnidade().getId() : null)
                .dataCriacao(a.getDataCriacao())
                .dataAtualizacao(a.getDataAtualizacao())
                .build();
    }


    private Unidade resolverUnidadeDoUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        Usuario usuario = usuarioRepository.findByEmail(auth.getName()).orElse(null);
        if (usuario == null) {
            return null;
        }
        if (usuario.getUnidades() != null && !usuario.getUnidades().isEmpty()) {
            return usuario.getUnidades().get(0);
        }
        return null;
    }

    private AnamneseResumoDTO toResumoDTO(Anamnese a) {
        String servicoNome = a.getServico() != null ? a.getServico().getNome() : a.getServicoNome();
        String templateNome = a.getTemplate() != null ? a.getTemplate().getNome() : null;
        return AnamneseResumoDTO.builder()
                .id(a.getId())
                .clienteNome(a.getCliente() != null ? a.getCliente().getNome() : null)
                .servicoNome(servicoNome)
                .templateNome(templateNome)
                .data(a.getData())
                .build();
    }
}
