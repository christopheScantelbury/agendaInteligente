package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.NotaFiscalDTO;
import br.com.agendainteligente.service.NotaFiscalService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notas-fiscais")
@RequiredArgsConstructor
@Tag(name = "Notas Fiscais", description = "API para gerenciamento de notas fiscais")
public class NotaFiscalController {

    private final NotaFiscalService notaFiscalService;

    @GetMapping("/agendamento/{agendamentoId}")
    @Operation(summary = "Buscar nota fiscal por agendamento")
    public ResponseEntity<NotaFiscalDTO> buscarPorAgendamento(@PathVariable Long agendamentoId) {
        return ResponseEntity.ok(notaFiscalService.buscarPorAgendamentoId(agendamentoId));
    }

    @PostMapping("/agendamento/{agendamentoId}/emitir")
    @Operation(summary = "Emitir nota fiscal para um agendamento")
    public ResponseEntity<Void> emitirNotaFiscal(@PathVariable Long agendamentoId) {
        notaFiscalService.emitirNotaFiscal(agendamentoId);
        return ResponseEntity.accepted().build();
    }
}

