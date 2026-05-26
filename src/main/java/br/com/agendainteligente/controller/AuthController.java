package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.CadastroAdminDTO;
import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.dto.TokenDTO;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.service.AuditLogService;
import br.com.agendainteligente.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "API para autenticação de usuários")
public class AuthController {

    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;
    private final UsuarioRepository usuarioRepository;
    private final AuditLogService auditLogService;

    @Value("${app.fix-admin-key:}")
    private String fixAdminKey;

    @PostMapping("/login")
    @Operation(summary = "Realizar login")
    public ResponseEntity<TokenDTO> login(@Valid @RequestBody LoginDTO loginDTO) {
        TokenDTO token = authService.login(loginDTO);
        auditLogService.registrar("LOGIN_SUCCESS", "Usuario", token.getUsuarioId(),
                "Login de " + loginDTO.getEmail(), null);
        return ResponseEntity.ok(token);
    }

    @PostMapping("/cadastro")
    @Operation(summary = "Cadastro administrativo inicial")
    public ResponseEntity<Void> cadastro(@Valid @RequestBody CadastroAdminDTO cadastroDTO) {
        authService.cadastrar(cadastroDTO);
        return ResponseEntity.status(201).build();
    }

    // Endpoint /hash/{senha} removido (era utilitário de dev exposto em prod — #113)

    /**
     * Corrige a senha do admin usando o mesmo PasswordEncoder da aplicacao.
     * So funciona se app.fix-admin-key (env FIX_ADMIN_KEY) estiver definido e for igual ao key enviado.
     * Usar uma unica vez em prod e depois remover a variavel.
     */
    @PostMapping("/fix-admin-senha")
    @Operation(summary = "Corrigir senha do admin (temporario, requer app.fix-admin-key)")
    public ResponseEntity<String> fixAdminSenha(
            @RequestParam String senha,
            @RequestParam String key) {
        if (fixAdminKey == null || fixAdminKey.isBlank()) {
            return ResponseEntity.notFound().build();
        }
        if (!fixAdminKey.equals(key)) {
            return ResponseEntity.status(403).body("key invalido");
        }
        Usuario admin = usuarioRepository.findByEmail("admin@agendainteligente.com")
                .orElseThrow(() -> new RuntimeException("Admin nao encontrado"));
        String novoHash = passwordEncoder.encode(senha);
        admin.setSenha(novoHash);
        usuarioRepository.save(admin);
        return ResponseEntity.ok("Senha do admin atualizada com sucesso. Faca login com a senha informada.");
    }
}
