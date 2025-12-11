package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.AtendenteDTO;
import br.com.agendainteligente.service.AtendenteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/atendentes")
@RequiredArgsConstructor
@Tag(name = "Atendentes", description = "API para gerenciamento de atendentes")
public class AtendenteController {

    private final AtendenteService atendenteService;

    @GetMapping
    @Operation(summary = "Listar todos os atendentes")
    public ResponseEntity<List<AtendenteDTO>> listarTodos() {
        return ResponseEntity.ok(atendenteService.listarTodos());
    }

    @GetMapping("/ativos")
    @Operation(summary = "Listar apenas atendentes ativos")
    public ResponseEntity<List<AtendenteDTO>> listarAtivos() {
        return ResponseEntity.ok(atendenteService.listarAtivos());
    }

    @GetMapping("/unidade/{unidadeId}")
    @Operation(summary = "Listar atendentes por unidade")
    public ResponseEntity<List<AtendenteDTO>> listarPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(atendenteService.listarPorUnidade(unidadeId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar atendente por ID")
    public ResponseEntity<AtendenteDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(atendenteService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar novo atendente")
    public ResponseEntity<AtendenteDTO> criar(@Valid @RequestBody AtendenteDTO atendenteDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(atendenteService.criar(atendenteDTO));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar atendente")
    public ResponseEntity<AtendenteDTO> atualizar(@PathVariable Long id,
                                                  @Valid @RequestBody AtendenteDTO atendenteDTO) {
        return ResponseEntity.ok(atendenteService.atualizar(id, atendenteDTO));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir atendente")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        atendenteService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}

