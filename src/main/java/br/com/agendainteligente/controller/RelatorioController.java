package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.FinanceiroDashboardDTO;
import br.com.agendainteligente.dto.FluxoCaixaDiarioDTO;
import br.com.agendainteligente.dto.PerformanceDTO;
import br.com.agendainteligente.service.RelatorioService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
public class RelatorioController {

    private final RelatorioService relatorioService;

    @GetMapping("/faturamento-mensal")
    public ResponseEntity<List<RelatorioService.FaturamentoMensalDTO>> faturamentoMensal(
            @RequestParam(defaultValue = "6") int meses,
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(relatorioService.faturamentoMensal(meses, unidadeId));
    }

    @GetMapping("/top-servicos")
    public ResponseEntity<List<RelatorioService.TopServicoDTO>> topServicos(
            @RequestParam(defaultValue = "6") int meses,
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(relatorioService.topServicos(meses, unidadeId));
    }

    @GetMapping("/taxa-retorno")
    public ResponseEntity<List<RelatorioService.TaxaRetornoDTO>> taxaRetorno(
            @RequestParam(defaultValue = "6") int meses,
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(relatorioService.taxaRetorno(meses, unidadeId));
    }

    @GetMapping("/performance")
    public PerformanceDTO performance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long atendenteId) {
        return relatorioService.performance(inicio, fim, atendenteId);
    }

    @GetMapping("/financeiro/dashboard")
    public FinanceiroDashboardDTO financeiroDashboard(
            @RequestParam int ano,
            @RequestParam(required = false) Long unidadeId) {
        return relatorioService.dashboardFinanceiro(ano, unidadeId);
    }

    @GetMapping("/financeiro/fluxo-diario")
    public List<FluxoCaixaDiarioDTO> fluxoDiario(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long unidadeId) {
        return relatorioService.fluxoDiario(inicio, fim, unidadeId);
    }
}
