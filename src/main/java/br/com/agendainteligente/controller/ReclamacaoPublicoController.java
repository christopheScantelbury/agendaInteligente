package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ReclamacaoDTO;
import br.com.agendainteligente.service.ReclamacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/publico/reclamacoes")
@RequiredArgsConstructor
@Tag(name = "Reclamações - Público", description = "API pública para envio de reclamações anônimas")
public class ReclamacaoPublicoController {

    private final ReclamacaoService reclamacaoService;

    @PostMapping
    @Operation(summary = "Criar reclamação anônima")
    public ResponseEntity<ReclamacaoDTO> criar(@Valid @RequestBody ReclamacaoDTO reclamacaoDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reclamacaoService.criar(reclamacaoDTO));
    }
}
