package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ServicoDTO;
import br.com.agendainteligente.service.ServicoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/servicos")
@RequiredArgsConstructor
@Tag(name = "Serviços", description = "API para gerenciamento de serviços")
public class ServicoController {

    private final ServicoService servicoService;

    @GetMapping
    @Operation(summary = "Listar todos os serviços")
    public ResponseEntity<List<ServicoDTO>> listarTodos() {
        return ResponseEntity.ok(servicoService.listarTodos());
    }

    @GetMapping("/ativos")
    @Operation(summary = "Listar apenas serviços ativos")
    public ResponseEntity<List<ServicoDTO>> listarAtivos() {
        return ResponseEntity.ok(servicoService.listarAtivos());
    }

    @GetMapping("/unidade/{unidadeId}")
    @Operation(summary = "Listar serviços de uma unidade")
    public ResponseEntity<List<ServicoDTO>> listarPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(servicoService.listarPorUnidade(unidadeId));
    }

    @GetMapping("/unidade/{unidadeId}/ativos")
    @Operation(summary = "Listar serviços ativos de uma unidade")
    public ResponseEntity<List<ServicoDTO>> listarAtivosPorUnidade(@PathVariable Long unidadeId) {
        return ResponseEntity.ok(servicoService.listarAtivosPorUnidade(unidadeId));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar serviço por ID")
    public ResponseEntity<ServicoDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servicoService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar novo serviço")
    public ResponseEntity<ServicoDTO> criar(@Valid @RequestBody ServicoDTO servicoDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(servicoService.criar(servicoDTO));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar serviço")
    public ResponseEntity<ServicoDTO> atualizar(@PathVariable Long id,
                                                @Valid @RequestBody ServicoDTO servicoDTO) {
        return ResponseEntity.ok(servicoService.atualizar(id, servicoDTO));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir serviço")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        servicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}

