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
        return anamneses.stream().map(this::toResumoDTO).collect(Collectors.toList());
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
            try {
                anamnese.setRespostas(objectMapper.writeValueAsString(dto.getRespostas()));
            } catch (JsonProcessingException e) {
                throw new BusinessException("Falha ao serializar respostas da anamnese");
            }
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
        return anamneseTemplateRepository.findByAtivoTrueOrderByNomeAsc().stream()
                .map(this::toTemplateDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AnamneseTemplateDTO buscarTemplatePorId(Long id) {
        AnamneseTemplate t = anamneseTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"));
        return toTemplateDTO(t);
    }

    @Transactional
    public AnamneseTemplateDTO salvarTemplate(AnamneseTemplateDTO dto) {
        AnamneseTemplate template = dto.getId() != null
                ? anamneseTemplateRepository.findById(dto.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"))
                : new AnamneseTemplate();
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
        try {
            template.setPerguntas(dto.getPerguntas() != null
                    ? objectMapper.writeValueAsString(dto.getPerguntas())
                    : null);
        } catch (JsonProcessingException e) {
            throw new BusinessException("Falha ao serializar perguntas do template");
        }
        return toTemplateDTO(anamneseTemplateRepository.save(template));
    }

    @Transactional
    public void inativarTemplate(Long id) {
        AnamneseTemplate template = anamneseTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template não encontrado"));
        template.setAtivo(false);
        anamneseTemplateRepository.save(template);
    }

    private AnamneseTemplateDTO toTemplateDTO(AnamneseTemplate t) {
        List<AnamneseTemplateDTO.Pergunta> perguntas = null;
        if (t.getPerguntas() != null && !t.getPerguntas().isBlank()) {
            try {
                perguntas = objectMapper.readValue(t.getPerguntas(),
                        new TypeReference<List<AnamneseTemplateDTO.Pergunta>>() {});
            } catch (JsonProcessingException e) {
                log.warn("Falha ao desserializar perguntas do template {}: {}", t.getId(), e.getMessage());
            }
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
                .respostas(parseRespostas(a.getRespostas()))
                .unidadeId(a.getUnidade() != null ? a.getUnidade().getId() : null)
                .dataCriacao(a.getDataCriacao())
                .dataAtualizacao(a.getDataAtualizacao())
                .build();
    }

    private java.util.Map<String, java.util.Map<String, Object>> parseRespostas(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json,
                    new TypeReference<java.util.Map<String, java.util.Map<String, Object>>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Falha ao desserializar respostas: {}", e.getMessage());
            return null;
        }
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
