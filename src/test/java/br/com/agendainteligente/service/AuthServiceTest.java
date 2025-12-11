package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.dto.TokenDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private Usuario usuario;
    private LoginDTO loginDTO;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder()
                .id(1L)
                .email("admin@test.com")
                .senha("$2a$10$encodedPassword")
                .nome("Admin")
                .perfil(PerfilUsuario.ADMIN)
                .ativo(true)
                .build();

        loginDTO = LoginDTO.builder()
                .email("admin@test.com")
                .senha("admin123")
                .build();
    }

    @Test
    void deveRealizarLoginComSucesso() {
        // Arrange
        Authentication authentication = mock(Authentication.class);
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.of(usuario));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        when(jwtTokenProvider.generateToken(authentication)).thenReturn("token123");

        // Act
        TokenDTO result = authService.login(loginDTO);

        // Assert
        assertNotNull(result);
        assertEquals("token123", result.getToken());
        assertEquals("Bearer", result.getTipo());
        assertEquals(1L, result.getUsuarioId());
        assertEquals("Admin", result.getNome());
        assertEquals("ADMIN", result.getPerfil());

        verify(usuarioRepository).findByEmail("admin@test.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtTokenProvider).generateToken(authentication);
    }

    @Test
    void deveLancarExcecaoQuandoUsuarioNaoExiste() {
        // Arrange
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            authService.login(loginDTO);
        });

        assertEquals("Email ou senha inválidos", exception.getMessage());
        verify(usuarioRepository).findByEmail("admin@test.com");
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void deveLancarExcecaoQuandoUsuarioInativo() {
        // Arrange
        usuario.setAtivo(false);
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.of(usuario));

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            authService.login(loginDTO);
        });

        assertEquals("Usuário inativo", exception.getMessage());
        verify(usuarioRepository).findByEmail("admin@test.com");
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void deveLancarExcecaoQuandoCredenciaisInvalidas() {
        // Arrange
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.of(usuario));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            authService.login(loginDTO);
        });

        assertEquals("Email ou senha inválidos", exception.getMessage());
        verify(usuarioRepository).findByEmail("admin@test.com");
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }
}

