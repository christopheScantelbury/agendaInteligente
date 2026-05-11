package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecuperacaoSenhaServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks private RecuperacaoSenhaService service;

    private Usuario usuario;
    private Cliente cliente;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder()
                .id(1L)
                .email("user@test.com")
                .ativo(true)
                .build();
        cliente = Cliente.builder()
                .id(1L)
                .email("cli@test.com")
                .cpfCnpj("12345678900")
                .ativo(true)
                .build();
    }

    // ── solicitarRecuperacaoSenhaUsuario ─────────────────────────────────────

    @Test
    void solicitarUsuario_geraTokenComExpiracao24h() {
        when(usuarioRepository.findByEmail("user@test.com")).thenReturn(Optional.of(usuario));

        service.solicitarRecuperacaoSenhaUsuario("user@test.com");

        assertNotNull(usuario.getTokenRecuperacaoSenha());
        assertNotNull(usuario.getTokenRecuperacaoSenhaExpiracao());
        assertTrue(usuario.getTokenRecuperacaoSenhaExpiracao().isAfter(LocalDateTime.now().plusHours(23)));
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void solicitarUsuario_lancaQuandoEmailNaoExiste() {
        when(usuarioRepository.findByEmail("nope@test.com")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> service.solicitarRecuperacaoSenhaUsuario("nope@test.com"));
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void solicitarUsuario_lancaQuandoInativo() {
        usuario.setAtivo(false);
        when(usuarioRepository.findByEmail("user@test.com")).thenReturn(Optional.of(usuario));
        assertThrows(BusinessException.class, () -> service.solicitarRecuperacaoSenhaUsuario("user@test.com"));
        verify(usuarioRepository, never()).save(any());
    }

    // ── solicitarRecuperacaoSenhaCliente ─────────────────────────────────────

    @Test
    void solicitarCliente_aceitaCpfComoFallbackDoEmail() {
        when(clienteRepository.findByEmail("12345678900")).thenReturn(Optional.empty());
        when(clienteRepository.findByCpfCnpj("12345678900")).thenReturn(Optional.of(cliente));

        service.solicitarRecuperacaoSenhaCliente("12345678900");

        assertNotNull(cliente.getTokenRecuperacaoSenha());
        verify(clienteRepository).save(cliente);
    }

    @Test
    void solicitarCliente_lancaQuandoSemEmailCadastrado() {
        cliente.setEmail(null);
        when(clienteRepository.findByEmail("12345678900")).thenReturn(Optional.empty());
        when(clienteRepository.findByCpfCnpj("12345678900")).thenReturn(Optional.of(cliente));

        assertThrows(BusinessException.class, () -> service.solicitarRecuperacaoSenhaCliente("12345678900"));
        verify(clienteRepository, never()).save(any());
    }

    // ── redefinirSenhaUsuario ────────────────────────────────────────────────

    @Test
    void redefinirUsuario_sucesso_limpaTokenESalva() {
        usuario.setTokenRecuperacaoSenha("tok");
        usuario.setTokenRecuperacaoSenhaExpiracao(LocalDateTime.now().plusHours(1));
        when(usuarioRepository.findByTokenRecuperacaoSenha("tok")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode("nova")).thenReturn("hashed");

        service.redefinirSenhaUsuario("tok", "nova");

        assertEquals("hashed", usuario.getSenha());
        assertNull(usuario.getTokenRecuperacaoSenha());
        assertNull(usuario.getTokenRecuperacaoSenhaExpiracao());
        verify(usuarioRepository).save(usuario);
    }

    @Test
    void redefinirUsuario_lancaQuandoTokenExpirado() {
        usuario.setTokenRecuperacaoSenha("tok");
        usuario.setTokenRecuperacaoSenhaExpiracao(LocalDateTime.now().minusHours(1));
        when(usuarioRepository.findByTokenRecuperacaoSenha("tok")).thenReturn(Optional.of(usuario));

        assertThrows(BusinessException.class, () -> service.redefinirSenhaUsuario("tok", "nova"));
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void redefinirUsuario_lancaQuandoTokenInvalido() {
        when(usuarioRepository.findByTokenRecuperacaoSenha("xx")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> service.redefinirSenhaUsuario("xx", "nova"));
    }

    // ── redefinirSenhaCliente ────────────────────────────────────────────────

    @Test
    void redefinirCliente_sucesso_limpaTokenESalva() {
        cliente.setTokenRecuperacaoSenha("tok");
        cliente.setTokenRecuperacaoSenhaExpiracao(LocalDateTime.now().plusHours(1));
        when(clienteRepository.findByTokenRecuperacaoSenha("tok")).thenReturn(Optional.of(cliente));
        when(passwordEncoder.encode("nova")).thenReturn("hashed");

        service.redefinirSenhaCliente("tok", "nova");

        assertEquals("hashed", cliente.getSenha());
        assertNull(cliente.getTokenRecuperacaoSenha());
        verify(clienteRepository).save(cliente);
    }
}
