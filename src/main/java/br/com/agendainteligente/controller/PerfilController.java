package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.UsuarioDTO;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.service.ClienteService;
import br.com.agendainteligente.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/perfil")
@RequiredArgsConstructor
@Tag(name = "Perfil", description = "API para gerenciamento de perfil do usuário autenticado")
public class PerfilController {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioService usuarioService;
    private final ClienteService clienteService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/usuario")
    @Operation(summary = "Obter perfil do usuário autenticado")
    public ResponseEntity<UsuarioDTO> meuPerfilUsuario() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        return ResponseEntity.ok(usuarioService.buscarPorId(usuario.getId()));
    }

    @PutMapping("/usuario")
    @Operation(summary = "Atualizar perfil do usuário autenticado")
    public ResponseEntity<UsuarioDTO> atualizarPerfilUsuario(@Valid @RequestBody UsuarioDTO usuarioDTO) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        // Garantir que está atualizando apenas seu próprio perfil
        usuarioDTO.setId(usuario.getId());
        // Não permitir alterar perfil ou email
        usuarioDTO.setPerfil(usuario.getPerfil());
        usuarioDTO.setEmail(usuario.getEmail());
        
        return ResponseEntity.ok(usuarioService.atualizar(usuario.getId(), usuarioDTO));
    }

    @PutMapping("/usuario/senha")
    @Operation(summary = "Alterar senha do usuário autenticado")
    public ResponseEntity<Void> alterarSenhaUsuario(@Valid @RequestBody AlterarSenhaDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));
        
        // Verificar senha atual
        if (!passwordEncoder.matches(dto.getSenhaAtual(), usuario.getSenha())) {
            throw new RuntimeException("Senha atual incorreta");
        }
        
        // Atualizar senha
        usuario.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        usuarioRepository.save(usuario);
        
        return ResponseEntity.ok().build();
    }

    @GetMapping("/cliente")
    @Operation(summary = "Obter perfil do cliente autenticado")
    public ResponseEntity<ClienteDTO> meuPerfilCliente() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String emailOuCpf = auth.getName();
        
        Cliente cliente = clienteRepository.findByEmail(emailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(emailOuCpf)
                        .orElseThrow(() -> new RuntimeException("Cliente não encontrado")));
        
        return ResponseEntity.ok(clienteService.buscarPorId(cliente.getId()));
    }

    @PutMapping("/cliente")
    @Operation(summary = "Atualizar perfil do cliente autenticado")
    public ResponseEntity<ClienteDTO> atualizarPerfilCliente(@Valid @RequestBody ClienteDTO clienteDTO) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String emailOuCpf = auth.getName();
        
        Cliente cliente = clienteRepository.findByEmail(emailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(emailOuCpf)
                        .orElseThrow(() -> new RuntimeException("Cliente não encontrado")));
        
        // Garantir que está atualizando apenas seu próprio perfil
        clienteDTO.setId(cliente.getId());
        // Não permitir alterar CPF/CNPJ
        clienteDTO.setCpfCnpj(cliente.getCpfCnpj());
        
        return ResponseEntity.ok(clienteService.atualizar(cliente.getId(), clienteDTO));
    }

    @PutMapping("/cliente/senha")
    @Operation(summary = "Alterar senha do cliente autenticado")
    public ResponseEntity<Void> alterarSenhaCliente(@Valid @RequestBody AlterarSenhaDTO dto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String emailOuCpf = auth.getName();
        
        Cliente cliente = clienteRepository.findByEmail(emailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(emailOuCpf)
                        .orElseThrow(() -> new RuntimeException("Cliente não encontrado")));
        
        if (cliente.getSenha() == null || cliente.getSenha().isEmpty()) {
            throw new RuntimeException("Cliente não possui senha cadastrada");
        }
        
        // Verificar senha atual
        if (!passwordEncoder.matches(dto.getSenhaAtual(), cliente.getSenha())) {
            throw new RuntimeException("Senha atual incorreta");
        }
        
        // Atualizar senha
        cliente.setSenha(passwordEncoder.encode(dto.getNovaSenha()));
        clienteRepository.save(cliente);
        
        return ResponseEntity.ok().build();
    }

    // DTO interno
    public static class AlterarSenhaDTO {
        private String senhaAtual;
        private String novaSenha;

        public String getSenhaAtual() {
            return senhaAtual;
        }

        public void setSenhaAtual(String senhaAtual) {
            this.senhaAtual = senhaAtual;
        }

        public String getNovaSenha() {
            return novaSenha;
        }

        public void setNovaSenha(String novaSenha) {
            this.novaSenha = novaSenha;
        }
    }
}


