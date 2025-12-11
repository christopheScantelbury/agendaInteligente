package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.ClinicaDTO;
import br.com.agendainteligente.service.ClinicaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clinicas")
@RequiredArgsConstructor
@Tag(name = "Clínicas", description = "API para gerenciamento de clínicas")
public class ClinicaController {

    private final ClinicaService clinicaService;

    @GetMapping
    @Operation(summary = "Listar todas as clínicas")
    public ResponseEntity<List<ClinicaDTO>> listarTodas() {
        return ResponseEntity.ok(clinicaService.listarTodas());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar clínica por ID")
    public ResponseEntity<ClinicaDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clinicaService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar nova clínica")
    public ResponseEntity<ClinicaDTO> criar(@Valid @RequestBody ClinicaDTO clinicaDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(clinicaService.criar(clinicaDTO));
    }
}

