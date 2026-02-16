package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.UsuarioDTO;
import br.com.agendainteligente.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
@Tag(name = "Usuários", description = "API para gerenciamento de usuários")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping
    @Operation(summary = "Listar todos os usuários")
    public ResponseEntity<List<UsuarioDTO>> listarTodos() {
        return ResponseEntity.ok(usuarioService.listarTodos());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar usuário por ID")
    public ResponseEntity<UsuarioDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.buscarPorId(id));
    }

    @PostMapping
    @Operation(summary = "Criar novo usuário")
    public ResponseEntity<UsuarioDTO> criar(@Valid @RequestBody UsuarioDTO usuarioDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(usuarioService.criar(usuarioDTO));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar usuário")
    public ResponseEntity<UsuarioDTO> atualizar(@PathVariable Long id,
                                                @Valid @RequestBody UsuarioDTO usuarioDTO) {
        return ResponseEntity.ok(usuarioService.atualizar(id, usuarioDTO));
    }

    @PutMapping("/{id}/senha")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Alterar senha do usuário (somente ADMIN)")
    public ResponseEntity<Void> alterarSenha(@PathVariable Long id,
                                             @RequestBody Map<String, String> body) {
        String novaSenha = body != null ? body.get("novaSenha") : null;
        usuarioService.alterarSenhaPorAdmin(id, novaSenha);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir usuário")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        usuarioService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}

