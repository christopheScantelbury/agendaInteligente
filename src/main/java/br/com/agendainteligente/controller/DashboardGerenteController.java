package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Endpoints do Dashboard do Gerente / Administrador.
 * Filtra dados pelo escopo do usuário logado (admin_unico_id ou unidade vinculada).
 */
@RestController
@RequestMapping("/api/dashboard/gerente")
@RequiredArgsConstructor
public class DashboardGerenteController {

    private static final Set<String> STATUS_CONCLUIDO = Set.of("CONCLUIDO", "FINALIZADO", "PROCEDIMENTO_FIM");
    private static final Set<String> STATUS_PERDA = Set.of("CANCELADO", "NO_SHOW");

    private final AgendamentoRepository agendamentoRepository;
    private final UnidadeRepository unidadeRepository;
    private final AtendenteRepository atendenteRepository;

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    public ResponseEntity<Map<String, Object>> kpis(@AuthenticationPrincipal Usuario usuario) {
        List<Long> unidadeIds = unidadeIdsDoUsuario(usuario);

        YearMonth atual = YearMonth.now();
        YearMonth anterior = atual.minusMonths(1);
        LocalDateTime inicioAtual = atual.atDay(1).atStartOfDay();
        LocalDateTime fimAtual = atual.atEndOfMonth().atTime(23, 59, 59);
        LocalDateTime inicioAnterior = anterior.atDay(1).atStartOfDay();
        LocalDateTime fimAnterior = anterior.atEndOfMonth().atTime(23, 59, 59);

        List<Agendamento> doEscopo = agendamentoRepository.findAll().stream()
                .filter(a -> a.getUnidade() != null && unidadeIds.contains(a.getUnidade().getId()))
                .toList();

        BigDecimal faturamentoAtual = somaFaturamentoConcluido(doEscopo, inicioAtual, fimAtual);
        BigDecimal faturamentoAnterior = somaFaturamentoConcluido(doEscopo, inicioAnterior, fimAnterior);
        Double variacao = variacaoPercentual(faturamentoAnterior, faturamentoAtual);

        long totalConcluidos = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                .count();

        BigDecimal ticketMedio = totalConcluidos > 0
                ? faturamentoAtual.divide(BigDecimal.valueOf(totalConcluidos), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long totalDoMes = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .count();
        long perdidos = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> STATUS_PERDA.contains(stringStatus(a)))
                .count();
        double taxaCancelamento = totalDoMes > 0 ? (perdidos * 100.0 / totalDoMes) : 0.0;

        // Ocupação: agendamentos no mês ÷ (profissionais ativos × dias × slots por dia estimado)
        long profissionais = atendenteRepository.findByUnidadeIdIn(unidadeIds).stream()
                .filter(at -> Boolean.TRUE.equals(at.getAtivo()))
                .count();
        LocalDate hoje = LocalDate.now();
        int diasDoMes = atual.lengthOfMonth();
        int diasDecorridos = atual.equals(YearMonth.from(hoje)) ? hoje.getDayOfMonth() : diasDoMes;
        long slotsEstimados = profissionais * Math.max(diasDecorridos, 1) * 8L; // 8 slots/dia estimado
        long agendados = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> !STATUS_PERDA.contains(stringStatus(a)))
                .count();
        double ocupacao = slotsEstimados > 0 ? (agendados * 100.0 / slotsEstimados) : 0.0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("faturamentoMes", faturamentoAtual);
        response.put("faturamentoMesAnterior", faturamentoAnterior);
        response.put("variacaoPercentual", variacao);
        response.put("ticketMedio", ticketMedio);
        response.put("totalAtendimentos", totalDoMes);
        response.put("atendimentosConcluidos", totalConcluidos);
        response.put("taxaCancelamento", arredondar(taxaCancelamento, 1));
        response.put("ocupacaoMedia", arredondar(Math.min(ocupacao, 100), 1));
        response.put("profissionaisAtivos", profissionais);
        return ResponseEntity.ok(response);
    }

    private List<Long> unidadeIdsDoUsuario(Usuario usuario) {
        if (usuario == null) return List.of();
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        List<Unidade> unidades = unidadeRepository.findByAdminUnicoId(adminId);
        if (unidades.isEmpty() && usuario.getUnidades() != null) {
            return usuario.getUnidades().stream().map(Unidade::getId).toList();
        }
        return unidades.stream().map(Unidade::getId).toList();
    }

    private BigDecimal somaFaturamentoConcluido(List<Agendamento> ags, LocalDateTime inicio, LocalDateTime fim) {
        return ags.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicio)
                        && !a.getDataHoraInicio().isAfter(fim))
                .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                .map(a -> a.getValorFinal() != null ? a.getValorFinal()
                        : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Double variacaoPercentual(BigDecimal anterior, BigDecimal atual) {
        if (anterior == null || anterior.compareTo(BigDecimal.ZERO) == 0) return null;
        return atual.subtract(anterior)
                .multiply(BigDecimal.valueOf(100))
                .divide(anterior, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String stringStatus(Agendamento a) {
        return a.getStatus() != null ? a.getStatus().name() : "";
    }

    private double arredondar(double v, int casas) {
        return BigDecimal.valueOf(v).setScale(casas, RoundingMode.HALF_UP).doubleValue();
    }
}
