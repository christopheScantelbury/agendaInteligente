package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.AuditLog;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AuditLogRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.security.JwtTokenProvider;
import br.com.agendainteligente.security.SecurityHelper;
import br.com.agendainteligente.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final JwtTokenProvider jwtTokenProvider;
    private final AuditLogService auditLogService;
    private final SecurityHelper securityHelper;

    // TTL curto da impersonação (15 minutos)
    private static final long IMPERSONATION_TTL_MS = 15 * 60 * 1000L;

    /**
     * Métricas agregadas da plataforma. Apenas counts; sem PII.
     */
    @GetMapping("/metricas")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
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

        // MRR: soma precoMensalBrl das empresas ativas com plano != TRIAL.
        // Calculado direto do banco — não depende de Stripe.
        java.math.BigDecimal mrr = empresaRepository.findByAtivoTrue().stream()
                .filter(e -> e.getPlano() != null
                        && !"TRIAL".equals(e.getPlano().getNome())
                        && e.getPlano().getPrecoMensalBrl() != null)
                .map(e -> e.getPlano().getPrecoMensalBrl())
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        // Churn 30d: empresas inativadas nos últimos 30 dias / total ativo no início do período.
        // Heurística: ativo=false + dataAtualizacao nos últimos 30 dias.
        // Quando o ciclo de billing rolar, refinar com `plano_expiracao` vencido + sem renovação.
        LocalDateTime ha30dias = LocalDateTime.now().minusDays(30);
        long inativadas30d = empresaRepository.findAll().stream()
                .filter(e -> Boolean.FALSE.equals(e.getAtivo())
                        && e.getDataAtualizacao() != null
                        && !e.getDataAtualizacao().isBefore(ha30dias))
                .count();
        // Base = empresas ativas hoje + as que viraram inativas no período (estavam ativas há 30d)
        long baseChurn = empresasAtivas + inativadas30d;
        Double churnPct = baseChurn > 0
                ? java.math.BigDecimal.valueOf(inativadas30d * 100.0 / baseChurn)
                        .setScale(1, java.math.RoundingMode.HALF_UP).doubleValue()
                : 0.0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("empresasAtivas", empresasAtivas);
        response.put("totalEmpresas", totalEmpresas);
        response.put("usuariosAtivos", usuariosAtivos);
        response.put("totalAgendamentos", totalAgendamentos);
        response.put("agendamentosMes", agendamentosMes);
        response.put("totalNfse", totalNfse);
        response.put("nfseMes", nfseMes);
        response.put("mrr", mrr);
        response.put("churn", churnPct);
        response.put("inativadas30d", inativadas30d);
        return ResponseEntity.ok(response);
    }

    /**
     * Listagem rica de empresas para o ADMIN global.
     * Inclui status, qtd de agendamentos no mês e última atividade computados em memória.
     * Para escalas maiores, migrar para query nativa com agregações.
     */
    @GetMapping("/empresas")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
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
     * Assumir sessão (#94): ADMIN global emite JWT temporário (15min) como ADMINISTRADOR da empresa-alvo.
     * Registra início e fim em audit_log com motivo obrigatório.
     */
    @PostMapping("/empresas/{empresaId}/assumir-sessao")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
    public ResponseEntity<Map<String, Object>> assumirSessao(
            @PathVariable Long empresaId,
            @RequestBody Map<String, String> body
    ) {
        Usuario admin = securityHelper.usuarioAtual();
        String motivo = body.getOrDefault("motivo", "").trim();
        if (motivo.isBlank() || motivo.length() < 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Motivo é obrigatório (mín. 5 caracteres)"));
        }

        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new RuntimeException("Empresa não encontrada"));

        Long adminUnicoId = empresa.getAdminUnicoId();
        if (adminUnicoId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Empresa sem ADMINISTRADOR vinculado"));
        }

        Usuario alvo = usuarioRepository.findById(adminUnicoId)
                .orElseThrow(() -> new RuntimeException("ADMINISTRADOR alvo não encontrado"));

        // Construir Authentication "como se fosse" o alvo
        String perfil = alvo.getPerfilSistema() != null ? alvo.getPerfilSistema().name() : "ADMINISTRADOR";
        Authentication authAlvo = new UsernamePasswordAuthenticationToken(
                alvo.getEmail(),
                null,
                List.of(
                        new SimpleGrantedAuthority("ROLE_" + perfil),
                        new SimpleGrantedAuthority("ROLE_ADMIN") // ADMINISTRADOR já tem ambos
                )
        );

        String token = jwtTokenProvider.generateToken(authAlvo, admin.getId(), IMPERSONATION_TTL_MS);

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("motivo", motivo);
        meta.put("empresaId", empresaId);
        meta.put("empresaNome", empresa.getNome());
        meta.put("alvoUsuarioId", alvo.getId());
        meta.put("alvoEmail", alvo.getEmail());
        auditLogService.registrar("IMPERSONATE_INICIO", "Empresa", empresaId,
                "ADMIN " + admin.getEmail() + " assumiu sessão da empresa " + empresa.getNome(), meta);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        response.put("tipo", "Bearer");
        response.put("expiresInMs", IMPERSONATION_TTL_MS);
        response.put("alvoUsuarioId", alvo.getId());
        response.put("alvoEmail", alvo.getEmail());
        response.put("alvoNome", alvo.getNome());
        response.put("alvoPerfil", perfil);
        response.put("empresaId", empresaId);
        response.put("empresaNome", empresa.getNome());
        return ResponseEntity.ok(response);
    }

    /**
     * Encerrar sessão impersonada. Só registra audit; o frontend já volta pro token original.
     */
    @PostMapping("/encerrar-sessao")
    public ResponseEntity<Void> encerrarSessao(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> meta = body != null ? body : new LinkedHashMap<>();
        auditLogService.registrar("IMPERSONATE_FIM", "Empresa",
                meta.get("empresaId") instanceof Number n ? n.longValue() : null,
                "Sessão impersonada encerrada", meta);
        return ResponseEntity.noContent().build();
    }

    /**
     * Listagem paginada do audit log. #95.
     */
    @GetMapping("/audit-log")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
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
