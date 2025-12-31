package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecuperacaoSenhaService {

    private final UsuarioRepository usuarioRepository;
    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;
    private static final int TEMPO_EXPIRACAO_HORAS = 24;

    @Transactional
    public void solicitarRecuperacaoSenhaUsuario(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Email não encontrado"));

        if (!usuario.getAtivo()) {
            throw new BusinessException("Usuário inativo");
        }

        String token = UUID.randomUUID().toString();
        usuario.setTokenRecuperacaoSenha(token);
        usuario.setTokenRecuperacaoSenhaExpiracao(LocalDateTime.now().plusHours(TEMPO_EXPIRACAO_HORAS));
        usuarioRepository.save(usuario);

        log.info("Token de recuperação gerado para usuário: {}", email);
        // Aqui você enviaria um email com o token
        // Por enquanto, apenas logamos (em produção, enviar email)
    }

    @Transactional
    public void solicitarRecuperacaoSenhaCliente(String emailOuCpf) {
        Cliente cliente = clienteRepository.findByEmail(emailOuCpf)
                .orElseGet(() -> clienteRepository.findByCpfCnpj(emailOuCpf)
                        .orElseThrow(() -> new BusinessException("Email ou CPF não encontrado")));

        if (!cliente.getAtivo()) {
            throw new BusinessException("Cliente inativo");
        }

        if (cliente.getEmail() == null || cliente.getEmail().isEmpty()) {
            throw new BusinessException("Cliente não possui email cadastrado para recuperação de senha");
        }

        String token = UUID.randomUUID().toString();
        cliente.setTokenRecuperacaoSenha(token);
        cliente.setTokenRecuperacaoSenhaExpiracao(LocalDateTime.now().plusHours(TEMPO_EXPIRACAO_HORAS));
        clienteRepository.save(cliente);

        log.info("Token de recuperação gerado para cliente: {}", emailOuCpf);
        // Aqui você enviaria um email com o token
    }

    @Transactional
    public void redefinirSenhaUsuario(String token, String novaSenha) {
        Usuario usuario = usuarioRepository.findByTokenRecuperacaoSenha(token)
                .orElseThrow(() -> new BusinessException("Token inválido ou expirado"));

        if (usuario.getTokenRecuperacaoSenhaExpiracao() == null ||
            usuario.getTokenRecuperacaoSenhaExpiracao().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Token expirado");
        }

        usuario.setSenha(passwordEncoder.encode(novaSenha));
        usuario.setTokenRecuperacaoSenha(null);
        usuario.setTokenRecuperacaoSenhaExpiracao(null);
        usuarioRepository.save(usuario);

        log.info("Senha redefinida para usuário: {}", usuario.getEmail());
    }

    @Transactional
    public void redefinirSenhaCliente(String token, String novaSenha) {
        Cliente cliente = clienteRepository.findByTokenRecuperacaoSenha(token)
                .orElseThrow(() -> new BusinessException("Token inválido ou expirado"));

        if (cliente.getTokenRecuperacaoSenhaExpiracao() == null ||
            cliente.getTokenRecuperacaoSenhaExpiracao().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Token expirado");
        }

        cliente.setSenha(passwordEncoder.encode(novaSenha));
        cliente.setTokenRecuperacaoSenha(null);
        cliente.setTokenRecuperacaoSenhaExpiracao(null);
        clienteRepository.save(cliente);

        log.info("Senha redefinida para cliente ID: {}", cliente.getId());
    }
}

