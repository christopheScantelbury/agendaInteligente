package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.enums.TipoPagamento;
import br.com.agendainteligente.dto.AjustarPagamentoAgendamentoDTO;
import br.com.agendainteligente.dto.PagamentoDTO;
import br.com.agendainteligente.dto.RegistrarPagamentoAgendamentoDTO;
import br.com.agendainteligente.service.PagamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pagamentos")
@RequiredArgsConstructor
@Tag(name = "Pagamentos", description = "API para gerenciamento de pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;

    @GetMapping("/agendamento/{agendamentoId}")
    @Operation(summary = "Buscar pagamento por agendamento")
    public ResponseEntity<PagamentoDTO> buscarPorAgendamento(@PathVariable Long agendamentoId) {
        return ResponseEntity.ok(pagamentoService.buscarPorAgendamentoId(agendamentoId));
    }

    @PostMapping("/agendamento/{agendamentoId}")
    @Operation(summary = "Processar pagamento de um agendamento")
    public ResponseEntity<PagamentoDTO> processarPagamento(@PathVariable Long agendamentoId,
                                                           @RequestParam TipoPagamento tipoPagamento) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pagamentoService.processarPagamento(agendamentoId, tipoPagamento));
    }

    @PostMapping("/agendamento/{agendamentoId}/registrar")
    @Operation(summary = "Registrar pagamento manual para um agendamento")
    public ResponseEntity<PagamentoDTO> registrarPagamento(@PathVariable Long agendamentoId,
                                                           @Valid @RequestBody RegistrarPagamentoAgendamentoDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(pagamentoService.registrarPagamento(
                        agendamentoId,
                        request.getTipoPagamento(),
                        request.getValor(),
                        request.getDataPagamento()
                ));
    }

    @PatchMapping("/agendamento/{agendamentoId}/ajustar")
    @Operation(summary = "Ajustar pagamento de um agendamento confirmado")
    public ResponseEntity<Void> ajustarPagamento(@PathVariable Long agendamentoId,
                                                 @RequestParam(defaultValue = "false") boolean remover,
                                                 @Valid @RequestBody AjustarPagamentoAgendamentoDTO request) {
        pagamentoService.ajustarPagamento(
                agendamentoId,
                request.getTipoPagamento(),
                request.getValorAjuste(),
                request.getDataPagamento(),
                remover
        );
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/confirmar/{idTransacao}")
    @Operation(summary = "Confirmar pagamento via webhook")
    public ResponseEntity<Void> confirmarPagamento(@PathVariable String idTransacao) {
        pagamentoService.confirmarPagamento(idTransacao);
        return ResponseEntity.noContent().build();
    }
}
