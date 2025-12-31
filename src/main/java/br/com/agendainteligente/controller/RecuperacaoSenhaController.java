package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.RecuperacaoSenhaDTO;
import br.com.agendainteligente.dto.RedefinirSenhaDTO;
import br.com.agendainteligente.service.RecuperacaoSenhaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/publico/recuperacao-senha")
@RequiredArgsConstructor
@Tag(name = "Recuperação de Senha", description = "API pública para recuperação de senha")
public class RecuperacaoSenhaController {

    private final RecuperacaoSenhaService recuperacaoSenhaService;

    @PostMapping("/usuario/solicitar")
    @Operation(summary = "Solicitar recuperação de senha para usuário")
    public ResponseEntity<Void> solicitarRecuperacaoUsuario(@Valid @RequestBody RecuperacaoSenhaDTO dto) {
        recuperacaoSenhaService.solicitarRecuperacaoSenhaUsuario(dto.getEmailOuCpf());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cliente/solicitar")
    @Operation(summary = "Solicitar recuperação de senha para cliente")
    public ResponseEntity<Void> solicitarRecuperacaoCliente(@Valid @RequestBody RecuperacaoSenhaDTO dto) {
        recuperacaoSenhaService.solicitarRecuperacaoSenhaCliente(dto.getEmailOuCpf());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/usuario/redefinir")
    @Operation(summary = "Redefinir senha de usuário com token")
    public ResponseEntity<Void> redefinirSenhaUsuario(@Valid @RequestBody RedefinirSenhaDTO dto) {
        recuperacaoSenhaService.redefinirSenhaUsuario(dto.getToken(), dto.getNovaSenha());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cliente/redefinir")
    @Operation(summary = "Redefinir senha de cliente com token")
    public ResponseEntity<Void> redefinirSenhaCliente(@Valid @RequestBody RedefinirSenhaDTO dto) {
        recuperacaoSenhaService.redefinirSenhaCliente(dto.getToken(), dto.getNovaSenha());
        return ResponseEntity.ok().build();
    }
}

