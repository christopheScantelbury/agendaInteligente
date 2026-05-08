package br.com.agendainteligente.controller;

import br.com.agendainteligente.service.RelatorioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/relatorios")
@RequiredArgsConstructor
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
}
