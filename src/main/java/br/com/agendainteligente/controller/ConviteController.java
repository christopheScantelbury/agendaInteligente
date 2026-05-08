package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.*;
import br.com.agendainteligente.service.ConviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/convites")
@RequiredArgsConstructor
@Tag(name = "Convites", description = "Links de convite para venda de acesso (admin) e cadastro de clientes (gerente)")
public class ConviteController {

    private final ConviteService conviteService;

    @PostMapping("/acesso")
    @Operation(summary = "Criar link de venda de acesso (admin)")
    public ResponseEntity<ConviteAcessoRespostaDTO> criarConviteAcesso(@Valid @RequestBody ConviteAcessoCriarDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conviteService.criarConviteAcesso(dto));
    }

    @GetMapping("/acesso")
    @Operation(summary = "Listar links de acesso criados (admin)")
    public ResponseEntity<List<ConviteAcessoRespostaDTO>> listarConvitesAcesso() {
        return ResponseEntity.ok(conviteService.listarConvitesAcesso());
    }

    @PostMapping("/cliente")
    @Operation(summary = "Criar link de cadastro para cliente (gerente)")
    public ResponseEntity<ConviteClienteRespostaDTO> criarConviteCliente(@Valid @RequestBody ConviteClienteCriarDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(conviteService.criarConviteCliente(dto));
    }

    @GetMapping("/cliente")
    @Operation(summary = "Listar links de cliente criados (gerente)")
    public ResponseEntity<List<ConviteClienteRespostaDTO>> listarConvitesCliente() {
        return ResponseEntity.ok(conviteService.listarConvitesCliente());
    }
}
