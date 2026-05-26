package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ComissaoLancamentoDTO;
import br.com.agendainteligente.dto.ComissaoPagamentoDTO;
import br.com.agendainteligente.dto.ComissaoRegraDTO;
import br.com.agendainteligente.dto.ComissaoResumoDTO;
import br.com.agendainteligente.service.ComissaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comissoes")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
public class ComissaoController {

    private final ComissaoService service;

    @GetMapping("/regras")
    public List<ComissaoRegraDTO> listarRegras(@RequestParam Long atendenteId) {
        return service.listarRegras(atendenteId);
    }

    @PostMapping("/regras")
    public ResponseEntity<ComissaoRegraDTO> salvarRegra(@Valid @RequestBody ComissaoRegraDTO dto) {
        return ResponseEntity.ok(service.salvarRegra(dto));
    }

    @DeleteMapping("/regras/{id}")
    public ResponseEntity<Void> excluirRegra(@PathVariable Long id) {
        service.excluirRegra(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pendentes")
    public List<ComissaoLancamentoDTO> listarPendentes(@RequestParam Long atendenteId) {
        return service.listarPendentes(atendenteId);
    }

    @GetMapping("/resumo")
    public ComissaoResumoDTO resumo(@RequestParam Long atendenteId) {
        return service.resumo(atendenteId);
    }

    @PostMapping("/pagar")
    public ResponseEntity<ComissaoPagamentoDTO> pagar(@RequestBody Map<String, Object> body) {
        Long atendenteId = ((Number) body.get("atendenteId")).longValue();
        @SuppressWarnings("unchecked")
        List<Number> rawIds = (List<Number>) body.get("lancamentosIds");
        List<Long> ids = rawIds == null ? List.of() : rawIds.stream().map(Number::longValue).toList();
        String formaPagamento = (String) body.getOrDefault("formaPagamento", null);
        String observacao = (String) body.getOrDefault("observacao", null);
        return ResponseEntity.ok(service.pagar(atendenteId, ids, formaPagamento, observacao));
    }

    @GetMapping("/pagamentos")
    public List<ComissaoPagamentoDTO> listarPagamentos(@RequestParam Long atendenteId) {
        return service.listarPagamentos(atendenteId);
    }
}
