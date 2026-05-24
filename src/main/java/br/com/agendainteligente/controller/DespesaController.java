package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.enums.StatusDespesa;
import br.com.agendainteligente.dto.DespesaDTO;
import br.com.agendainteligente.dto.DespesaResumoDTO;
import br.com.agendainteligente.service.DespesaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/despesas")
@RequiredArgsConstructor
public class DespesaController {

    private final DespesaService service;

    @GetMapping
    public List<DespesaDTO> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long unidadeId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String busca) {
        return service.listar(inicio, fim, unidadeId, status, busca);
    }

    @GetMapping("/resumo")
    public DespesaResumoDTO resumo(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long unidadeId) {
        return service.resumo(inicio, fim, unidadeId);
    }

    @GetMapping("/{id}")
    public DespesaDTO buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

    @PostMapping
    public ResponseEntity<DespesaDTO> criar(@Valid @RequestBody DespesaDTO dto) {
        return ResponseEntity.ok(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DespesaDTO> atualizar(@PathVariable Long id, @Valid @RequestBody DespesaDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DespesaDTO> alterarStatus(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        StatusDespesa novo = StatusDespesa.valueOf(((String) body.get("status")).toUpperCase());
        Object dataPag = body.get("dataPagamento");
        LocalDate data = dataPag != null ? LocalDate.parse(dataPag.toString()) : null;
        return ResponseEntity.ok(service.alterarStatus(id, novo, data));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
