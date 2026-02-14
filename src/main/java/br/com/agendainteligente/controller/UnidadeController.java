package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.UnidadeDTO;
import br.com.agendainteligente.service.UnidadeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/unidades")
@RequiredArgsConstructor
@Tag(name = "Unidades", description = "API para gerenciamento de unidades")
public class UnidadeController {

    private final UnidadeService unidadeService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Listar unidades (filtradas por perfil; CLIENTE vê só as suas)")
    public ResponseEntity<List<UnidadeDTO>> listarTodos() {
        return ResponseEntity.ok(unidadeService.listarTodos());
    }

    @GetMapping("/ativas")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Listar apenas unidades ativas (filtradas por perfil)")
    public ResponseEntity<List<UnidadeDTO>> listarAtivas() {
        return ResponseEntity.ok(unidadeService.listarAtivas());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Buscar unidade por ID")
    public ResponseEntity<UnidadeDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(unidadeService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Criar nova unidade")
    public ResponseEntity<UnidadeDTO> criar(@Valid @RequestBody UnidadeDTO unidadeDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(unidadeService.criar(unidadeDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Atualizar unidade")
    public ResponseEntity<UnidadeDTO> atualizar(@PathVariable Long id,
                                                 @Valid @RequestBody UnidadeDTO unidadeDTO) {
        return ResponseEntity.ok(unidadeService.atualizar(id, unidadeDTO));
    }
}

