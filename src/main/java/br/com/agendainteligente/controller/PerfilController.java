package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.service.PerfilService;
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
@RequestMapping("/api/perfis")
@RequiredArgsConstructor
@Tag(name = "Perfis", description = "API para gerenciamento de perfis e permissões")
public class PerfilController {

    private final PerfilService perfilService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar todos os perfis")
    public ResponseEntity<List<PerfilDTO>> listarTodas() {
        return ResponseEntity.ok(perfilService.listarTodos());
    }

    @GetMapping("/ativos")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar apenas perfis ativos")
    public ResponseEntity<List<PerfilDTO>> listarAtivos() {
        return ResponseEntity.ok(perfilService.listarAtivos());
    }

    @GetMapping("/customizados")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar apenas perfis customizados (não do sistema)")
    public ResponseEntity<List<PerfilDTO>> listarCustomizados() {
        return ResponseEntity.ok(perfilService.listarCustomizados());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar perfil por ID")
    public ResponseEntity<PerfilDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(perfilService.buscarPorId(id));
    }

    @GetMapping("/nome/{nome}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Buscar perfil por nome")
    public ResponseEntity<PerfilDTO> buscarPorNome(@PathVariable String nome) {
        return ResponseEntity.ok(perfilService.buscarPorNome(nome));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Criar novo perfil customizado")
    public ResponseEntity<PerfilDTO> criar(@Valid @RequestBody PerfilDTO perfilDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(perfilService.criar(perfilDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Atualizar perfil customizado")
    public ResponseEntity<PerfilDTO> atualizar(@PathVariable Long id,
                                                @Valid @RequestBody PerfilDTO perfilDTO) {
        return ResponseEntity.ok(perfilService.atualizar(id, perfilDTO));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Excluir perfil customizado")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        perfilService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
