package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ReclamacaoDTO;
import br.com.agendainteligente.service.ReclamacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reclamacoes")
@RequiredArgsConstructor
@Tag(name = "Reclamações", description = "API para gerenciamento de reclamações")
public class ReclamacaoController {

    private final ReclamacaoService reclamacaoService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Listar todas as reclamações")
    public ResponseEntity<List<ReclamacaoDTO>> listarTodas() {
        return ResponseEntity.ok(reclamacaoService.listarTodas());
    }

    @GetMapping("/nao-lidas")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Listar reclamações não lidas")
    public ResponseEntity<List<ReclamacaoDTO>> listarNaoLidas() {
        return ResponseEntity.ok(reclamacaoService.listarNaoLidas());
    }

    @GetMapping("/contador")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Contar reclamações não lidas")
    public ResponseEntity<Long> contarNaoLidas() {
        return ResponseEntity.ok(reclamacaoService.contarNaoLidas());
    }

    @GetMapping("/unidade/{unidadeId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Listar reclamações por unidade")
    public ResponseEntity<List<ReclamacaoDTO>> listarPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(reclamacaoService.listarPorUnidade(unidadeId));
    }

    @GetMapping("/unidade/{unidadeId}/nao-lidas")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Listar reclamações não lidas por unidade")
    public ResponseEntity<List<ReclamacaoDTO>> listarNaoLidasPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(reclamacaoService.listarNaoLidasPorUnidade(unidadeId));
    }

    @GetMapping("/unidade/{unidadeId}/contador")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Contar reclamações não lidas por unidade")
    public ResponseEntity<Long> contarNaoLidasPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(reclamacaoService.contarNaoLidasPorUnidade(unidadeId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Buscar reclamação por ID")
    public ResponseEntity<ReclamacaoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(reclamacaoService.buscarPorId(id));
    }

    @PutMapping("/{id}/marcar-lida")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Marcar reclamação como lida")
    public ResponseEntity<ReclamacaoDTO> marcarComoLida(@PathVariable Long id) {
        return ResponseEntity.ok(reclamacaoService.marcarComoLida(id));
    }
}
