package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.dto.TokenDTO;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/login")
    @Operation(summary = "Realizar login")
    public ResponseEntity<TokenDTO> login(@Valid @RequestBody LoginDTO loginDTO) {
        return ResponseEntity.ok(authService.login(loginDTO));
    }

    @GetMapping("/hash/{senha}")
    @Operation(summary = "Gerar hash de senha (temporário)")
    public ResponseEntity<String> gerarHash(@PathVariable String senha) {
        String hash = passwordEncoder.encode(senha);
        return ResponseEntity.ok(hash);
    }

    // Endpoint temporário para resetar senha do admin - REMOVER EM PRODUÇÃO
    // @PostMapping("/reset-admin")
    // @Operation(summary = "Resetar senha do admin (temporário)")
    // public ResponseEntity<String> resetAdminPassword() {
    //     var admin = usuarioRepository.findByEmail("admin@agendainteligente.com")
    //             .orElseThrow(() -> new RuntimeException("Admin não encontrado"));
    //     
    //     String novoHash = passwordEncoder.encode("admin123");
    //     admin.setSenha(novoHash);
    //     usuarioRepository.save(admin);
    //     
    //     return ResponseEntity.ok("Senha do admin resetada. Hash: " + novoHash);
    // }
}

