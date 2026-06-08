package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Plano;
import br.com.agendainteligente.dto.PlanoDTO;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.PlanoRepository;
import br.com.agendainteligente.security.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
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

    /**
     * Edita preço/limites/descrição do plano. NOME técnico (TRIAL/STARTER/...) é imutável.
     * Só ADMIN GLOBAL pode editar — ADMINISTRADOR de tenant não tem permissão.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
    @Transactional
    public ResponseEntity<PlanoDTO> atualizar(@PathVariable Long id, @RequestBody PlanoDTO dto) {
        Plano plano = planoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Plano não encontrado"));
        // Nome técnico permanece imutável (referenciado no código por findByNome("TRIAL"))
        if (dto.getNomePublico() != null && !dto.getNomePublico().isBlank()) plano.setNomePublico(dto.getNomePublico().trim());
        if (dto.getDescricao() != null) plano.setDescricao(dto.getDescricao());
        if (dto.getPrecoMensalBrl() != null) plano.setPrecoMensalBrl(dto.getPrecoMensalBrl());
        // null intencional = ilimitado (preserva semântica)
        plano.setLimiteUnidades(dto.getLimiteUnidades());
        plano.setLimiteProfissionais(dto.getLimiteProfissionais());
        plano.setLimiteAgendamentosMes(dto.getLimiteAgendamentosMes());
        if (dto.getLimiteNfseMes() != null) plano.setLimiteNfseMes(dto.getLimiteNfseMes());
        plano.setPrecoExcedenteNfseBrl(dto.getPrecoExcedenteNfseBrl());
        if (dto.getDuracaoTrialDias() != null) plano.setDuracaoTrialDias(dto.getDuracaoTrialDias());
        if (dto.getOrdem() != null) plano.setOrdem(dto.getOrdem());
        if (dto.getAtivo() != null) plano.setAtivo(dto.getAtivo());
        return ResponseEntity.ok(toDTO(planoRepository.save(plano)));
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
