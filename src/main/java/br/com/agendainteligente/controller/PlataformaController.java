package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.AuditLog;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AuditLogRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Endpoints exclusivos do ADMIN global — visão de plataforma.
 * Não expõe dados operacionais de tenants específicos.
 */
@RestController
@RequestMapping("/api/plataforma")
@RequiredArgsConstructor
public class PlataformaController {

    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final NotaFiscalRepository notaFiscalRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditLogRepository auditLogRepository;

    /**
     * Métricas agregadas da plataforma. Apenas counts; sem PII.
     */
    @GetMapping("/metricas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> metricasPlataforma() {
        LocalDateTime inicioDoMes = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        long empresasAtivas = empresaRepository.findByAtivoTrue().size();
        long totalEmpresas = empresaRepository.count();
        long usuariosAtivos = usuarioRepository.findAll().stream().filter(u -> Boolean.TRUE.equals(u.getAtivo())).count();
        long totalAgendamentos = agendamentoRepository.count();
        long agendamentosMes = agendamentoRepository.findAll().stream()
                .filter(a -> a.getDataHoraInicio() != null && !a.getDataHoraInicio().isBefore(inicioDoMes))
                .count();
        long totalNfse = notaFiscalRepository.count();
        long nfseMes = notaFiscalRepository.findAll().stream()
                .filter(n -> n.getDataCriacao() != null && !n.getDataCriacao().isBefore(inicioDoMes))
                .count();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("empresasAtivas", empresasAtivas);
        response.put("totalEmpresas", totalEmpresas);
        response.put("usuariosAtivos", usuariosAtivos);
        response.put("totalAgendamentos", totalAgendamentos);
        response.put("agendamentosMes", agendamentosMes);
        response.put("totalNfse", totalNfse);
        response.put("nfseMes", nfseMes);
        // Placeholders — dependem de integração Stripe (escopo futuro)
        response.put("mrr", null);
        response.put("churn", null);
        return ResponseEntity.ok(response);
    }

    /**
     * Listagem rica de empresas para o ADMIN global.
     * Inclui status, qtd de agendamentos no mês e última atividade computados em memória.
     * Para escalas maiores, migrar para query nativa com agregações.
     */
    @GetMapping("/empresas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> listarEmpresasComMetricas() {
        LocalDateTime inicioDoMes = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        List<Empresa> empresas = empresaRepository.findAll();
        List<Map<String, Object>> resultado = new ArrayList<>();

        for (Empresa e : empresas) {
            Long adminId = e.getAdminUnicoId();
            List<Long> unidadeIds = adminId == null
                    ? List.of()
                    : unidadeRepository.findByAdminUnicoId(adminId).stream().map(u -> u.getId()).toList();

            long qtdAgendamentosMes = unidadeIds.isEmpty()
                    ? 0
                    : agendamentoRepository.findAll().stream()
                            .filter(a -> a.getUnidade() != null && unidadeIds.contains(a.getUnidade().getId()))
                            .filter(a -> a.getDataHoraInicio() != null && !a.getDataHoraInicio().isBefore(inicioDoMes))
                            .count();

            LocalDateTime ultimaAtividade = unidadeIds.isEmpty()
                    ? e.getDataAtualizacao()
                    : agendamentoRepository.findAll().stream()
                            .filter(a -> a.getUnidade() != null && unidadeIds.contains(a.getUnidade().getId()))
                            .map(a -> a.getDataAtualizacao() != null ? a.getDataAtualizacao() : a.getDataCriacao())
                            .filter(d -> d != null)
                            .max(Comparator.naturalOrder())
                            .orElse(e.getDataAtualizacao());

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", e.getId());
            item.put("nome", e.getNome());
            item.put("razaoSocial", e.getRazaoSocial());
            item.put("cnpj", e.getCnpj());
            item.put("email", e.getEmail());
            item.put("categoria", e.getCategoria() != null ? e.getCategoria().name() : null);
            item.put("status", Boolean.TRUE.equals(e.getAtivo()) ? "ATIVA" : "INATIVA");
            item.put("dataCadastro", e.getDataCriacao());
            item.put("ultimaAtividade", ultimaAtividade);
            item.put("agendamentosMes", qtdAgendamentosMes);
            item.put("plano", null); // Placeholder — escopo Stripe
            item.put("mrr", null);   // Placeholder — escopo Stripe
            resultado.add(item);
        }
        return ResponseEntity.ok(resultado);
    }

    /**
     * Listagem paginada do audit log. #95.
     */
    @GetMapping("/audit-log")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<AuditLog>> auditLog(
            @RequestParam(required = false) String tipoAcao,
            @RequestParam(required = false) Long autorId,
            @RequestParam(required = false) Long empresaId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime de,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime ate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        Page<AuditLog> resultado = auditLogRepository.buscarComFiltros(
                tipoAcao, autorId, empresaId, de, ate, PageRequest.of(page, Math.min(size, 200))
        );
        return ResponseEntity.ok(resultado);
    }
}
