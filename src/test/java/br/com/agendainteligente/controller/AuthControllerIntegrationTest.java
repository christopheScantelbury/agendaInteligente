package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        usuarioRepository.deleteAll();
        
        Usuario usuario = Usuario.builder()
                .email("admin@test.com")
                .senha(passwordEncoder.encode("admin123"))
                .nome("Admin Test")
                .perfil(PerfilUsuario.ADMIN)
                .ativo(true)
                .build();
        
        usuarioRepository.save(usuario);
    }

    @Test
    void deveRealizarLoginComSucesso() throws Exception {
        LoginDTO loginDTO = LoginDTO.builder()
                .email("admin@test.com")
                .senha("admin123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.usuarioId").exists())
                .andExpect(jsonPath("$.nome").value("Admin Test"));
    }

    @Test
    void deveRetornarErroQuandoCredenciaisInvalidas() throws Exception {
        LoginDTO loginDTO = LoginDTO.builder()
                .email("admin@test.com")
                .senha("senhaErrada")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email ou senha inválidos"));
    }

    @Test
    void deveRetornarErroQuandoUsuarioNaoExiste() throws Exception {
        LoginDTO loginDTO = LoginDTO.builder()
                .email("naoexiste@test.com")
                .senha("admin123")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email ou senha inválidos"));
    }
}

