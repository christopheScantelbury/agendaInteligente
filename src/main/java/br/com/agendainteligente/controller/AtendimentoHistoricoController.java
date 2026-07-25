package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.AtendimentoHistoricoDTO;
import br.com.agendainteligente.service.AtendimentoHistoricoService;
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
@RequestMapping("/api/atendimentos-historico")
@RequiredArgsConstructor
@Tag(name = "Histórico de atendimentos", description = "Linha do tempo de atendimentos da cliente (#174)")
public class AtendimentoHistoricoController {

    private final AtendimentoHistoricoService service;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Listar atendimentos de uma cliente (ordem cronológica)")
    public ResponseEntity<List<AtendimentoHistoricoDTO>> listar(@RequestParam Long clienteId) {
        return ResponseEntity.ok(service.listarPorCliente(clienteId));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Registrar novo atendimento no histórico")
    public ResponseEntity<AtendimentoHistoricoDTO> criar(@Valid @RequestBody AtendimentoHistoricoDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Editar um atendimento do histórico")
    public ResponseEntity<AtendimentoHistoricoDTO> atualizar(@PathVariable Long id, @Valid @RequestBody AtendimentoHistoricoDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Excluir um atendimento do histórico")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
