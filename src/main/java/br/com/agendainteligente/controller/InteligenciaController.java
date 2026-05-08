package br.com.agendainteligente.controller;

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
}
