package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.NotaFacilStatusDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.integration.notafacil.NotaFacilClient;
import br.com.agendainteligente.integration.notafacil.NotaFacilException;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * #159: provisiona uma conta no Nota MEI Gateway parceiro pra unidade,
 * obtendo a api_key automaticamente. Substitui o input manual de chave.
 *
 * Permissão: ADMIN, ADMINISTRADOR (da empresa-mãe), GERENTE da unidade.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotaFacilProvisioningService {

    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotaFacilClient notaFacilClient;

    /**
     * Avalia pré-requisitos sem chamar o gateway. Usado pelo card no frontend
     * pra mostrar checklist e habilitar/desabilitar o botão.
     */
    @Transactional(readOnly = true)
    public NotaFacilStatusDTO status(Long unidadeId) {
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        validarAcesso(unidade, false);

        boolean provisionado = unidade.getNotafacilApiKey() != null && !unidade.getNotafacilApiKey().isBlank();

        return NotaFacilStatusDTO.builder()
                .provisionado(provisionado)
                .apiKeyMascarada(mascararApiKey(unidade.getNotafacilApiKey()))
                .provisionadoEm(unidade.getNotafacilProvisionadoEm())
                .notafacilAtivo(Boolean.TRUE.equals(unidade.getNotafacilAtivo()))
                .preRequisitos(avaliarPreRequisitos(unidade))
                .build();
    }

    /**
     * Chama o gateway pra criar uma conta MEI e gravar a api_key retornada.
     * Falha se algum pré-requisito não está OK.
     */
    @Transactional
    public NotaFacilStatusDTO provisionar(Long unidadeId) {
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        validarAcesso(unidade, true);

        if (unidade.getNotafacilApiKey() != null && !unidade.getNotafacilApiKey().isBlank()) {
            throw new BusinessException("Esta unidade já tem emissão de NFS-e ativa. Revogue antes de re-provisionar.");
        }

        List<NotaFacilStatusDTO.PreRequisito> pendentes = avaliarPreRequisitos(unidade).stream()
                .filter(p -> !p.isOk())
                .toList();
        if (!pendentes.isEmpty()) {
            String chaves = pendentes.stream()
                    .map(NotaFacilStatusDTO.PreRequisito::getRotulo)
                    .reduce((a, b) -> a + ", " + b)
                    .orElse("");
            throw new BusinessException("Faltam dados pra provisionar: " + chaves);
        }

        NotaFacilClient.RegisterRequest req = NotaFacilClient.RegisterRequest.builder()
                .cnpj(unidade.getCnpj())
                .razaoSocial(escolherRazaoSocial(unidade))
                .email(escolherEmail(unidade))
                .municipioIbge(unidade.getMunicipioIbge())
                .produto("mei")
                .build();

        NotaFacilClient.RegisterResponse resp;
        try {
            resp = notaFacilClient.registerMei(req);
        } catch (NotaFacilException e) {
            log.error("Falha ao provisionar NotaFácil pra unidade {}: {}", unidadeId, e.getMessage());
            throw new BusinessException("Falha ao provisionar emissão de NFS-e: " + e.getMessage());
        }

        if (resp == null || resp.getApiKey() == null || resp.getApiKey().isBlank()) {
            throw new BusinessException("Gateway não retornou a chave de emissão. Tente novamente.");
        }

        unidade.setNotafacilApiKey(resp.getApiKey());
        unidade.setNotafacilAtivo(true);
        unidade.setNotafacilProvisionadoEm(LocalDateTime.now());
        unidade = unidadeRepository.save(unidade);
        log.info("[NotaFácil] Unidade {} provisionada (mei_id={})", unidadeId, resp.getMeiId());

        return status(unidadeId);
    }

    @Transactional
    public NotaFacilStatusDTO revogar(Long unidadeId) {
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new ResourceNotFoundException("Unidade não encontrada"));
        validarAcesso(unidade, true);
        // Só ADMIN/ADMINISTRADOR podem revogar (GERENTE pode provisionar mas não revogar)
        Usuario logado = usuarioLogado();
        if (logado.getPerfil() == Usuario.PerfilUsuario.GERENTE) {
            throw new BusinessException("Apenas administrador pode revogar emissão de NFS-e");
        }

        unidade.setNotafacilApiKey(null);
        unidade.setNotafacilAtivo(false);
        unidade.setNotafacilProvisionadoEm(null);
        unidadeRepository.save(unidade);
        log.info("[NotaFácil] Unidade {} revogada", unidadeId);

        return status(unidadeId);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private List<NotaFacilStatusDTO.PreRequisito> avaliarPreRequisitos(Unidade unidade) {
        List<NotaFacilStatusDTO.PreRequisito> lista = new ArrayList<>();

        String cnpj = unidade.getCnpj() == null ? "" : unidade.getCnpj().replaceAll("\\D", "");
        lista.add(NotaFacilStatusDTO.PreRequisito.builder()
                .chave("cnpj")
                .rotulo("CNPJ válido")
                .ok(cnpj.length() == 14)
                .detalhe(cnpj.length() == 14 ? formatarCnpj(cnpj) : "Cadastre o CNPJ da unidade")
                .build());

        lista.add(NotaFacilStatusDTO.PreRequisito.builder()
                .chave("inscricaoMunicipal")
                .rotulo("Inscrição Municipal")
                .ok(unidade.getInscricaoMunicipal() != null && !unidade.getInscricaoMunicipal().isBlank())
                .detalhe(unidade.getInscricaoMunicipal())
                .build());

        lista.add(NotaFacilStatusDTO.PreRequisito.builder()
                .chave("regimeTributario")
                .rotulo("Regime Tributário")
                .ok(unidade.getRegimeTributario() != null && !unidade.getRegimeTributario().isBlank())
                .detalhe(unidade.getRegimeTributario())
                .build());

        lista.add(NotaFacilStatusDTO.PreRequisito.builder()
                .chave("municipioIbge")
                .rotulo("Código IBGE do Município")
                .ok(unidade.getMunicipioIbge() != null && unidade.getMunicipioIbge().matches("\\d{7}"))
                .detalhe(unidade.getMunicipioIbge())
                .build());

        // Plano com cota NFS-e > 0 — verifica via Empresa→Plano
        Empresa empresa = unidade.getEmpresa();
        boolean planoOk = empresa != null && empresa.getPlano() != null
                && empresa.getPlano().getLimiteNfseMes() != null
                && empresa.getPlano().getLimiteNfseMes() > 0;
        String detalhePlano = empresa != null && empresa.getPlano() != null
                ? empresa.getPlano().getNomePublico() + " (" + (empresa.getPlano().getLimiteNfseMes() != null
                        ? empresa.getPlano().getLimiteNfseMes() : 0) + "/mês)"
                : "Empresa sem plano comercial";
        lista.add(NotaFacilStatusDTO.PreRequisito.builder()
                .chave("plano")
                .rotulo("Plano com cota NFS-e")
                .ok(planoOk)
                .detalhe(detalhePlano)
                .build());

        return lista;
    }

    private String escolherRazaoSocial(Unidade u) {
        if (u.getRazaoSocial() != null && !u.getRazaoSocial().isBlank()) return u.getRazaoSocial();
        return u.getNome();
    }

    private String escolherEmail(Unidade u) {
        if (u.getEmail() != null && !u.getEmail().isBlank()) return u.getEmail();
        if (u.getEmpresa() != null && u.getEmpresa().getEmail() != null) return u.getEmpresa().getEmail();
        return "sem-email@" + (u.getId() != null ? u.getId() : 0) + ".local";
    }

    private String mascararApiKey(String key) {
        if (key == null || key.isBlank()) return null;
        if (key.length() <= 8) return "sk_***";
        return key.substring(0, 8) + "***" + key.substring(key.length() - 4);
    }

    private String formatarCnpj(String cnpj) {
        if (cnpj.length() != 14) return cnpj;
        return cnpj.substring(0, 2) + "." + cnpj.substring(2, 5) + "." + cnpj.substring(5, 8)
                + "/" + cnpj.substring(8, 12) + "-" + cnpj.substring(12);
    }

    private Usuario usuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
    }

    private void validarAcesso(Unidade unidade, boolean acaoEscrita) {
        Usuario u = usuarioLogado();
        Usuario.PerfilUsuario perfil = u.getPerfil();
        if (perfil == Usuario.PerfilUsuario.ADMIN) return;

        Empresa empresa = unidade.getEmpresa();
        if (perfil == Usuario.PerfilUsuario.ADMINISTRADOR) {
            if (empresa != null && u.getId().equals(empresa.getAdminUnicoId())) return;
            // fallback: unidade tem adminUnicoId direto
            if (u.getId().equals(unidade.getAdminUnicoId())) return;
        }
        if (perfil == Usuario.PerfilUsuario.GERENTE && u.getUnidades() != null) {
            boolean gerenciaEsta = u.getUnidades().stream()
                    .anyMatch(uu -> uu.getId().equals(unidade.getId()));
            if (gerenciaEsta) return;
        }
        throw new BusinessException(acaoEscrita
                ? "Sem permissão para gerenciar emissão de NFS-e desta unidade"
                : "Sem permissão para visualizar status desta unidade");
    }
}
