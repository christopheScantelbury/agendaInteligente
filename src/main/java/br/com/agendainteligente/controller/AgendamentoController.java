package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.service.AgendamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
@RequiredArgsConstructor
@Tag(name = "Agendamentos", description = "API para gerenciamento de agendamentos")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @GetMapping
    @Operation(summary = "Listar todos os agendamentos")
    public ResponseEntity<List<AgendamentoDTO>> listarTodos() {
        return ResponseEntity.ok(agendamentoService.listarTodos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar agendamento por ID")
    public ResponseEntity<AgendamentoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(agendamentoService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar novo agendamento")
    public ResponseEntity<AgendamentoDTO> criar(@Valid @RequestBody AgendamentoDTO agendamentoDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(agendamentoService.criar(agendamentoDTO));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Atualizar status do agendamento")
    public ResponseEntity<AgendamentoDTO> atualizarStatus(@PathVariable Long id,
                                                           @RequestParam StatusAgendamento status) {
        return ResponseEntity.ok(agendamentoService.atualizarStatus(id, status));
    }

    @PostMapping("/{id}/cancelar")
    @Operation(summary = "Cancelar agendamento")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        agendamentoService.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/finalizar")
    @Operation(summary = "Finalizar agendamento e emitir NFS-e")
    public ResponseEntity<AgendamentoDTO> finalizar(@PathVariable Long id,
                                                     @Valid @RequestBody br.com.agendainteligente.dto.FinalizarAgendamentoDTO finalizarDTO) {
        return ResponseEntity.ok(agendamentoService.finalizar(id, finalizarDTO));
    }
}

