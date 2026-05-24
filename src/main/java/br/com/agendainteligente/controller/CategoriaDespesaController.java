package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.CategoriaDespesaDTO;
import br.com.agendainteligente.service.CategoriaDespesaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categorias-despesa")
@RequiredArgsConstructor
public class CategoriaDespesaController {

    private final CategoriaDespesaService service;

    @GetMapping
    public List<CategoriaDespesaDTO> listar() {
        return service.listar();
    }

    @PostMapping
    public ResponseEntity<CategoriaDespesaDTO> criar(@Valid @RequestBody CategoriaDespesaDTO dto) {
        return ResponseEntity.ok(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoriaDespesaDTO> atualizar(@PathVariable Long id, @Valid @RequestBody CategoriaDespesaDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> inativar(@PathVariable Long id) {
        service.inativar(id);
        return ResponseEntity.noContent().build();
    }
}
