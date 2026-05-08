package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.InsightSemanal;
import br.com.agendainteligente.repository.InsightSemanalRepository;
import br.com.agendainteligente.service.InsightAgendadoService;
import br.com.agendainteligente.service.InteligenciaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inteligencia")
@RequiredArgsConstructor
public class InteligenciaController {

    private final InteligenciaService inteligenciaService;
    private final InsightAgendadoService insightAgendadoService;
    private final InsightSemanalRepository insightSemanalRepository;

    @GetMapping("/horarios-populares")
    public ResponseEntity<List<InteligenciaService.HorarioPopularDTO>> horariosPopulares(
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(inteligenciaService.horariosPopulares(unidadeId));
    }

    @GetMapping("/risco-no-show")
    public ResponseEntity<List<InteligenciaService.NoShowRiscoDTO>> riscoNoShow(
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(inteligenciaService.calcularRiscoNoShow(unidadeId));
    }

    @GetMapping("/servicos-complementares")
    public ResponseEntity<List<InteligenciaService.ServicoComplementarDTO>> servicosComplementares(
            @RequestParam Long servicoId) {
        return ResponseEntity.ok(inteligenciaService.servicosComplementares(servicoId));
    }

    @GetMapping("/insights-semanais")
    public ResponseEntity<List<InsightSemanal>> insightsSemanal(
            @RequestParam(required = false) Long unidadeId) {
        List<InsightSemanal> insights = unidadeId != null
                ? insightSemanalRepository.findTop4ByUnidadeIdOrderBySemanaDesc(unidadeId)
                : insightSemanalRepository.findTop4ByUnidadeIdIsNullOrderBySemanaDesc();
        return ResponseEntity.ok(insights);
    }

    @GetMapping("/clientes-risco")
    public ResponseEntity<List<InsightAgendadoService.ClienteRiscoDTO>> clientesEmRisco(
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(insightAgendadoService.clientesEmRisco(unidadeId));
    }

    @GetMapping("/churn-profissional")
    public ResponseEntity<List<InsightAgendadoService.ProfissionalChurnDTO>> churnPorProfissional(
            @RequestParam(required = false) Long unidadeId) {
        return ResponseEntity.ok(insightAgendadoService.churnPorProfissional(unidadeId));
    }
}
