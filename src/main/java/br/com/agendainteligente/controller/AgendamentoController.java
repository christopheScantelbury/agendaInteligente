package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AtualizarObservacaoAgendamentoDTO;
import br.com.agendainteligente.service.AgendamentoService;
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
@RequestMapping("/api/agendamentos")
@RequiredArgsConstructor
@Tag(name = "Agendamentos", description = "API para gerenciamento de agendamentos")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Listar agendamentos (filtrado por permissão; CLIENTE vê só os próprios)")
    public ResponseEntity<List<AgendamentoDTO>> listarTodos() {
        return ResponseEntity.ok(agendamentoService.listarTodos());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Buscar agendamento por ID")
    public ResponseEntity<AgendamentoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(agendamentoService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Criar novo agendamento")
    public ResponseEntity<AgendamentoDTO> criar(@Valid @RequestBody AgendamentoDTO agendamentoDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(agendamentoService.criar(agendamentoDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Atualizar agendamento")
    public ResponseEntity<AgendamentoDTO> atualizar(@PathVariable Long id,
                                                    @Valid @RequestBody AgendamentoDTO agendamentoDTO) {
        return ResponseEntity.ok(agendamentoService.atualizar(id, agendamentoDTO));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Atualizar status do agendamento")
    public ResponseEntity<AgendamentoDTO> atualizarStatus(@PathVariable Long id,
                                                           @RequestParam StatusAgendamento status) {
        return ResponseEntity.ok(agendamentoService.atualizarStatus(id, status));
    }

    @PatchMapping("/{id}/observacao")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Atualizar observação do agendamento")
    public ResponseEntity<AgendamentoDTO> atualizarObservacao(@PathVariable Long id,
                                                              @RequestBody AtualizarObservacaoAgendamentoDTO request) {
        return ResponseEntity.ok(agendamentoService.atualizarObservacao(id, request.getObservacoes()));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Cancelar agendamento")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        agendamentoService.cancelar(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL', 'CLIENTE')")
    @Operation(summary = "Excluir agendamento")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        agendamentoService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/finalizar")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Finalizar agendamento e emitir NFS-e")
    public ResponseEntity<AgendamentoDTO> finalizar(@PathVariable Long id,
                                                     @Valid @RequestBody br.com.agendainteligente.dto.FinalizarAgendamentoDTO finalizarDTO) {
        return ResponseEntity.ok(agendamentoService.finalizar(id, finalizarDTO));
    }
}
