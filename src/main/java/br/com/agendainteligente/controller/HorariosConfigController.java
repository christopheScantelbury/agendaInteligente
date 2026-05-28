package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.security.SecurityHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Configuração dos horários de funcionamento das unidades.
 * Endpoint leve para o checklist "Definir horários de funcionamento" do gerente —
 * lê e atualiza apenas horarioAbertura/horarioFechamento, sem tocar nos demais
 * campos da unidade.
 */
@RestController
@RequestMapping("/configuracoes/horarios")
@RequiredArgsConstructor
@Tag(name = "Horários de funcionamento", description = "Horários por unidade")
public class HorariosConfigController {

    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final SecurityHelper securityHelper;

    @GetMapping
    @Operation(summary = "Listar horários de funcionamento das unidades da empresa")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listar() {
        Empresa empresa = empresaDoUsuario();
        List<Map<String, Object>> body = empresa.getUnidades() == null
                ? List.of()
                : empresa.getUnidades().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                    .map(this::toResponse)
                    .toList();
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{unidadeId}")
    @Operation(summary = "Atualizar horários de uma unidade")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizar(
            @PathVariable Long unidadeId,
            @RequestBody HorariosRequest req
    ) {
        Empresa empresa = empresaDoUsuario();
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new BusinessException("Unidade não encontrada"));

        // Garante que a unidade pertence à empresa do usuário (tenant safety)
        if (unidade.getEmpresa() == null || !unidade.getEmpresa().getId().equals(empresa.getId())) {
            throw new BusinessException("Você não tem permissão para editar esta unidade");
        }

        LocalTime abertura = parseTime(req.abertura(), "abertura");
        LocalTime fechamento = parseTime(req.fechamento(), "fechamento");

        if (abertura != null && fechamento != null && !fechamento.isAfter(abertura)) {
            throw new BusinessException("O horário de fechamento precisa ser depois do de abertura");
        }

        unidade.setHorarioAbertura(abertura);
        unidade.setHorarioFechamento(fechamento);
        unidadeRepository.save(unidade);
        return ResponseEntity.ok(toResponse(unidade));
    }

    // === Helpers ===

    private Empresa empresaDoUsuario() {
        Usuario usuario = securityHelper.usuarioAtual();
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        return empresaRepository.findByAdminUnicoId(adminId).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("Empresa não encontrada para o usuário logado"));
    }

    private LocalTime parseTime(String raw, String campo) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return LocalTime.parse(raw);
        } catch (Exception e) {
            throw new BusinessException("Formato de horário inválido para " + campo + " (use HH:mm)");
        }
    }

    private Map<String, Object> toResponse(Unidade u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("unidadeId", u.getId());
        m.put("nome", u.getNome());
        m.put("abertura", u.getHorarioAbertura() != null ? u.getHorarioAbertura().toString() : null);
        m.put("fechamento", u.getHorarioFechamento() != null ? u.getHorarioFechamento().toString() : null);
        return m;
    }

    public record HorariosRequest(String abertura, String fechamento) {}
}
