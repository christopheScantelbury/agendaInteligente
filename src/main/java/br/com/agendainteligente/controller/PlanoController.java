package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Plano;
import br.com.agendainteligente.dto.PlanoDTO;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.PlanoRepository;
import br.com.agendainteligente.security.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * #138 + #139: Endpoints de planos.
 * - GET /api/planos              → catálogo público (sem auth) — usado em /precos/onboarding
 * - GET /api/planos/meu          → plano atual da empresa do usuário logado
 */
@RestController
@RequestMapping("/api/planos")
@RequiredArgsConstructor
public class PlanoController {

    private final PlanoRepository planoRepository;
    private final EmpresaRepository empresaRepository;
    private final SecurityHelper securityHelper;

    /** Catálogo público pra landing/onboarding. */
    @GetMapping
    public List<PlanoDTO> listar() {
        return planoRepository.findByAtivoTrueOrderByOrdemAsc().stream()
                .map(this::toDTO)
                .toList();
    }

    /** Plano atual da empresa do usuário logado. Útil pra exibir billing/limites. */
    @GetMapping("/meu")
    public ResponseEntity<Map<String, Object>> meuPlano() {
        var usuario = securityHelper.usuarioAtual();
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        List<Empresa> empresas = empresaRepository.findByAdminUnicoId(adminId);
        if (empresas.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                "plano", (Object) null,
                "mensagem", "Empresa sem plano associado"
            ));
        }
        Empresa empresa = empresas.get(0); // primeiro tenant — modelo de 1 empresa por admin
        Plano plano = empresa.getPlano();
        Map<String, Object> resp = new java.util.LinkedHashMap<>();
        resp.put("plano", plano != null ? toDTO(plano) : null);
        resp.put("planoInicio", empresa.getPlanoInicio());
        resp.put("planoExpiracao", empresa.getPlanoExpiracao());
        return ResponseEntity.ok(resp);
    }

    private PlanoDTO toDTO(Plano p) {
        return PlanoDTO.builder()
                .id(p.getId())
                .nome(p.getNome())
                .nomePublico(p.getNomePublico())
                .descricao(p.getDescricao())
                .precoMensalBrl(p.getPrecoMensalBrl())
                .limiteUnidades(p.getLimiteUnidades())
                .limiteProfissionais(p.getLimiteProfissionais())
                .limiteAgendamentosMes(p.getLimiteAgendamentosMes())
                .limiteNfseMes(p.getLimiteNfseMes())
                .precoExcedenteNfseBrl(p.getPrecoExcedenteNfseBrl())
                .duracaoTrialDias(p.getDuracaoTrialDias())
                .ordem(p.getOrdem())
                .ativo(p.getAtivo())
                .build();
    }
}
