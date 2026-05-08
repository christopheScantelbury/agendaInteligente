package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.*;
import br.com.agendainteligente.service.ConviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/publico/convites")
@RequiredArgsConstructor
@Tag(name = "Convites - Público", description = "Consultar link e finalizar cadastro (gerente ou cliente) sem autenticação")
public class ConvitePublicoController {

    private final ConviteService conviteService;

    @GetMapping("/acesso/{token}")
    @Operation(summary = "Informações do link de cadastro gerente")
    public ResponseEntity<ConviteAcessoInfoDTO> infoConviteAcesso(@PathVariable String token) {
        return ResponseEntity.ok(conviteService.obterInfoConviteAcesso(token));
    }

    @PostMapping("/acesso/{token}/finalizar")
    @Operation(summary = "Finalizar cadastro do gerente (empresa + unidade(s) + usuário)")
    public ResponseEntity<Void> finalizarCadastroGerente(
            @PathVariable String token,
            @Valid @RequestBody FinalizarCadastroGerenteDTO dto) {
        conviteService.finalizarCadastroGerente(token, dto);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/cliente/{token}")
    @Operation(summary = "Informações do link de cadastro cliente")
    public ResponseEntity<ConviteClienteInfoDTO> infoConviteCliente(@PathVariable String token) {
        return ResponseEntity.ok(conviteService.obterInfoConviteCliente(token));
    }

    @PostMapping("/cliente/{token}/finalizar")
    @Operation(summary = "Finalizar cadastro do cliente (usuário + dados do cliente)")
    public ResponseEntity<Void> finalizarCadastroCliente(
            @PathVariable String token,
            @Valid @RequestBody FinalizarCadastroClienteDTO dto) {
        conviteService.finalizarCadastroCliente(token, dto);
        return ResponseEntity.noContent().build();
    }
}
