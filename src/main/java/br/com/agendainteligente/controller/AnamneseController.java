package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.AnamneseDTO;
import br.com.agendainteligente.dto.AnamneseResumoDTO;
import br.com.agendainteligente.dto.AnamneseTemplateDTO;
import br.com.agendainteligente.service.AnamneseService;
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
@RequiredArgsConstructor
@Tag(name = "Anamneses", description = "API para gerenciamento de fichas de anamnese")
public class AnamneseController {

    private final AnamneseService anamneseService;

    @GetMapping("/api/anamneses")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Listar fichas de anamnese")
    public ResponseEntity<List<AnamneseResumoDTO>> listar(
            @RequestParam(required = false) Long unidadeId,
            @RequestParam(required = false) Long clienteId) {
        return ResponseEntity.ok(anamneseService.listar(unidadeId, clienteId));
    }

    @GetMapping("/api/anamneses/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Buscar ficha de anamnese por ID")
    public ResponseEntity<AnamneseDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(anamneseService.buscarPorId(id));
    }

    @PostMapping("/api/anamneses")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Criar nova ficha de anamnese")
    public ResponseEntity<AnamneseDTO> criar(@Valid @RequestBody AnamneseDTO anamneseDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(anamneseService.salvar(anamneseDTO));
    }

    @PutMapping("/api/anamneses/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Editar ficha de anamnese existente")
    public ResponseEntity<AnamneseDTO> atualizar(@PathVariable Long id, @Valid @RequestBody AnamneseDTO anamneseDTO) {
        return ResponseEntity.ok(anamneseService.atualizar(id, anamneseDTO));
    }

    @DeleteMapping("/api/anamneses/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Excluir ficha de anamnese")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        anamneseService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/anamnese-templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRADOR', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Listar templates de anamnese ativos")
    public ResponseEntity<List<AnamneseTemplateDTO>> listarTemplates() {
        return ResponseEntity.ok(anamneseService.listarTemplatesAtivos());
    }

    @GetMapping("/api/anamnese-templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRADOR', 'GERENTE', 'PROFISSIONAL')")
    @Operation(summary = "Buscar template de anamnese por ID")
    public ResponseEntity<AnamneseTemplateDTO> buscarTemplate(@PathVariable Long id) {
        return ResponseEntity.ok(anamneseService.buscarTemplatePorId(id));
    }

    @PostMapping("/api/anamnese-templates")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRADOR', 'GERENTE')")
    @Operation(summary = "Criar novo template de anamnese")
    public ResponseEntity<AnamneseTemplateDTO> criarTemplate(@Valid @RequestBody AnamneseTemplateDTO dto) {
        dto.setId(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(anamneseService.salvarTemplate(dto));
    }

    @PutMapping("/api/anamnese-templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRADOR', 'GERENTE')")
    @Operation(summary = "Atualizar template de anamnese")
    public ResponseEntity<AnamneseTemplateDTO> atualizarTemplate(@PathVariable Long id, @Valid @RequestBody AnamneseTemplateDTO dto) {
        dto.setId(id);
        return ResponseEntity.ok(anamneseService.salvarTemplate(dto));
    }

    @DeleteMapping("/api/anamnese-templates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ADMINISTRADOR', 'GERENTE')")
    @Operation(summary = "Inativar template de anamnese")
    public ResponseEntity<Void> inativarTemplate(@PathVariable Long id) {
        anamneseService.inativarTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
