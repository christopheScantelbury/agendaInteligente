package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ClienteDuplicataDTO;
import br.com.agendainteligente.dto.ClienteResumoDTO;
import br.com.agendainteligente.dto.ClienteRetornoDTO;
import br.com.agendainteligente.dto.ClienteSumidoDTO;
import br.com.agendainteligente.service.ClienteInsightsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
@Tag(name = "Clientes Insights", description = "Endpoints de inteligência e análise de clientes")
public class ClienteInsightsController {

    private final ClienteInsightsService clienteInsightsService;

    @GetMapping("/retornos")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE') or hasRole('PROFISSIONAL')")
    @Operation(summary = "Buscar clientes com retorno previsto para um serviço")
    public ResponseEntity<List<ClienteRetornoDTO>> buscarRetornos(
            @RequestParam Long unidadeId,
            @RequestParam Long servicoId,
            @RequestParam(defaultValue = "30") int diasLimite) {
        return ResponseEntity.ok(clienteInsightsService.buscarRetornos(unidadeId, servicoId, diasLimite));
    }

    @GetMapping("/sumidos")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE') or hasRole('PROFISSIONAL')")
    @Operation(summary = "Buscar clientes sem retorno há X dias")
    public ResponseEntity<List<ClienteSumidoDTO>> buscarSumidos(
            @RequestParam Long unidadeId,
            @RequestParam(defaultValue = "15") int diasSemRetorno,
            @RequestParam(defaultValue = "1") int minAtendimentos) {
        return ResponseEntity.ok(clienteInsightsService.buscarSumidos(unidadeId, diasSemRetorno, minAtendimentos));
    }

    @GetMapping("/{id}/resumo")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE') or hasRole('PROFISSIONAL')")
    @Operation(summary = "Resumo rápido do cliente (para modal de acesso rápido)")
    public ResponseEntity<ClienteResumoDTO> buscarResumo(@PathVariable Long id) {
        return ResponseEntity.ok(clienteInsightsService.buscarResumo(id));
    }

    @GetMapping("/duplicatas")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Buscar clientes potencialmente duplicados")
    public ResponseEntity<List<ClienteDuplicataDTO>> buscarDuplicatas(@RequestParam Long unidadeId) {
        return ResponseEntity.ok(clienteInsightsService.buscarDuplicatas(unidadeId));
    }
}
