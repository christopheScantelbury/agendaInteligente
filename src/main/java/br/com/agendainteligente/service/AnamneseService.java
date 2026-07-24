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
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.entity.Agendamento;
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

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnamneseService {

    private final AnamneseRepository anamneseRepository;
    private final AnamneseTemplateRepository anamneseTemplateRepository;
    private final AgendamentoRepository agendamentoRepository;
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

        Map<Long, JanelaAtendimento> janelasAtendimentoPorCliente = carregarJanelasAtendimento(anamneses);
        return anamneses.stream()
                .map(anamnese -> toResumoDTO(anamnese, janelasAtendimentoPorCliente.get(clienteIdDa(anamnese))))
                .collect(Collectors.toList());
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
                // Hardening #149: resolver empresaIds via query e empresa→unidades via
                // findByEmpresaIdIn em vez de findAll() + filter em memória.
                java.util.List<Long> gerenteUnidadeIds = usuario.getUnidades().stream()
                        .map(Unidade::getId)
                        .collect(Collectors.toList());
                java.util.Set<Long> empresaIds = new java.util.HashSet<>(
                        unidadeRepository.findEmpresaIdsByIds(gerenteUnidadeIds));
                if (empresaIds.isEmpty()) return java.util.Set.of();
                return unidadeRepository.findByEmpresaIdIn(empresaIds).stream()
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

        Anamnese anamnese = new Anamnese();
        anamnese.setCliente(cliente);
        anamnese.setUnidade(unidade);
        aplicarCampos(anamnese, dto, servico, template);

        anamnese = anamneseRepository.save(anamnese);
        log.info("Anamnese criada com sucesso. ID: {}", anamnese.getId());
        return toDTO(anamnese);
    }

    /**
     * #173: edita uma ficha existente sem recriar o registro. Preserva o cliente
     * e a unidade originais (identidade/tenant da ficha não mudam por payload) e
     * valida que o usuário logado tem acesso à unidade dela (mesmo filtro da
     * listagem). @PreUpdate atualiza data_atualizacao automaticamente.
     */
    @Transactional
    public AnamneseDTO atualizar(Long id, AnamneseDTO dto) {
        Anamnese anamnese = anamneseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Anamnese não encontrada com id: " + id));
        validarAcessoAnamnese(anamnese);

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

        // cliente e unidade NÃO mudam (identidade e tenant da ficha)
        aplicarCampos(anamnese, dto, servico, template);
        anamnese = anamneseRepository.save(anamnese);
        log.info("Anamnese atualizada. ID: {}", anamnese.getId());
        return toDTO(anamnese);
    }

    /** SEC: a ficha tem que estar numa unidade que o usuário logado pode acessar. */
    private void validarAcessoAnamnese(Anamnese anamnese) {
        java.util.Set<Long> permitidas = obterUnidadesIdsPermitidas();
        if (permitidas == null) return; // ADMIN global
        Long unidadeId = anamnese.getUnidade() != null ? anamnese.getUnidade().getId() : null;
        if (unidadeId == null || !permitidas.contains(unidadeId)) {
            throw new ResourceNotFoundException("Anamnese não encontrada");
        }
    }

    /** Aplica os campos editáveis do DTO na entity (compartilhado por salvar/atualizar). */
    private void aplicarCampos(Anamnese a, AnamneseDTO dto, Servico servico, AnamneseTemplate template) {
        a.setServico(servico);
        a.setServicoNome(dto.getServicoNome());
        a.setTemplate(template);
        a.setData(dto.getData());
        a.setUsaRimel(dto.getUsaRimel());
        a.setUsaRimelObs(dto.getUsaRimelObs());
        a.setProcedimentosRecentesOlhos(dto.getProcedimentosRecentesOlhos());
        a.setProcedimentosRecentesOlhosObs(dto.getProcedimentosRecentesOlhosObs());
        a.setAlergias(dto.getAlergias());
        a.setAlergiasObs(dto.getAlergiasObs());
        a.setProblemasOculares(dto.getProblemasOculares());
        a.setProblemasOcularesObs(dto.getProblemasOcularesObs());
        a.setTratamentoOncologico(dto.getTratamentoOncologico());
        a.setTratamentoOncologicoObs(dto.getTratamentoOncologicoObs());
        a.setTireoide(dto.getTireoide());
        a.setTireoidedObs(dto.getTireoidedObs());
        a.setDormeDeLado(dto.getDormeDeLado());
        a.setDormeDeLadoObs(dto.getDormeDeLadoObs());
        a.setGravidez(dto.getGravidez());
        a.setGravidezObs(dto.getGravidezObs());
        a.setOutrosProblemas(dto.getOutrosProblemas());
        a.setOutrosProblemasDescricao(dto.getOutrosProblemasDescricao());
        a.setMapping(dto.getMapping());
        a.setMarcaFios(dto.getMarcaFios());
        a.setEspessura(dto.getEspessura());
        a.setCurvatura(dto.getCurvatura());
        a.setAdesivo(dto.getAdesivo());
        a.setUsoImagem(dto.getUsoImagem() != null ? dto.getUsoImagem() : false);
        a.setObservacoes(dto.getObservacoes());
        a.setRespostas(dto.getRespostas() != null && !dto.getRespostas().isEmpty() ? dto.getRespostas() : null);
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
        return toResumoDTO(a, null);
    }

    private AnamneseResumoDTO toResumoDTO(Anamnese a, JanelaAtendimento janelaAtendimento) {
        String servicoNome = a.getServico() != null ? a.getServico().getNome() : a.getServicoNome();
        String templateNome = a.getTemplate() != null ? a.getTemplate().getNome() : null;
        return AnamneseResumoDTO.builder()
                .id(a.getId())
                .clienteId(clienteIdDa(a))
                .clienteNome(a.getCliente() != null ? a.getCliente().getNome() : null)
                .servicoNome(servicoNome)
                .templateNome(templateNome)
                .data(a.getData())
                .primeiroAtendimento(janelaAtendimento != null ? janelaAtendimento.primeiroAtendimento() : null)
                .ultimoAtendimento(janelaAtendimento != null ? janelaAtendimento.ultimoAtendimento() : null)
                .build();
    }

    private Map<Long, JanelaAtendimento> carregarJanelasAtendimento(List<Anamnese> anamneses) {
        Set<Long> clienteIds = anamneses.stream()
                .map(this::clienteIdDa)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, JanelaAtendimento> resultado = new HashMap<>();
        for (Long clienteId : clienteIds) {
            List<Agendamento> concluidos = agendamentoRepository
                    .findByClienteIdAndStatusOrderByDataHoraInicioDesc(clienteId, StatusAgendamento.CONCLUIDO);
            LocalDateTime ultimoAtendimento = concluidos.isEmpty() ? null : concluidos.get(0).getDataHoraInicio();
            LocalDateTime primeiroAtendimento = concluidos.isEmpty()
                    ? null
                    : concluidos.get(concluidos.size() - 1).getDataHoraInicio();
            resultado.put(clienteId, new JanelaAtendimento(primeiroAtendimento, ultimoAtendimento));
        }
        return resultado;
    }

    private Long clienteIdDa(Anamnese anamnese) {
        return anamnese.getCliente() != null ? anamnese.getCliente().getId() : null;
    }

    private record JanelaAtendimento(LocalDateTime primeiroAtendimento, LocalDateTime ultimoAtendimento) {}
}
