package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.*;
import br.com.agendainteligente.domain.enums.Perfil;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AgendamentoServicoDTO;
import br.com.agendainteligente.dto.FinalizarAgendamentoDTO;
import br.com.agendainteligente.repository.*;
import br.com.agendainteligente.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AgendamentoControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AgendamentoRepository agendamentoRepository;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UnidadeRepository unidadeRepository;

    @Autowired
    private AtendenteRepository atendenteRepository;

    @Autowired
    private ServicoRepository servicoRepository;

    @Autowired
    private ClinicaRepository clinicaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String token;
    private Cliente cliente;
    private Unidade unidade;
    private Atendente atendente;
    private Servico servico;

    @BeforeEach
    void setUp() {
        // Limpar dados
        agendamentoRepository.deleteAll();
        atendenteRepository.deleteAll();
        servicoRepository.deleteAll();
        clienteRepository.deleteAll();
        unidadeRepository.deleteAll();
        clinicaRepository.deleteAll();
        usuarioRepository.deleteAll();

        // Criar usuário e token
        Usuario usuario = Usuario.builder()
                .email("admin@test.com")
                .senha(passwordEncoder.encode("admin123"))
                .nome("Admin")
                .perfil(Perfil.ADMIN)
                .ativo(true)
                .build();
        usuario = usuarioRepository.save(usuario);

        Authentication authentication = new UsernamePasswordAuthenticationToken(
                usuario.getEmail(),
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
        token = jwtTokenProvider.generateToken(authentication);

        // Criar dados de teste
        Clinica clinica = Clinica.builder()
                .nome("Clínica Test")
                .cnpj("12345678000100")
                .ativo(true)
                .build();
        clinica = clinicaRepository.save(clinica);

        unidade = Unidade.builder()
                .nome("Unidade Test")
                .endereco("Rua Test")
                .clinica(clinica)
                .ativo(true)
                .build();
        unidade = unidadeRepository.save(unidade);

        servico = Servico.builder()
                .nome("Serviço Test")
                .descricao("Descrição do serviço")
                .valor(BigDecimal.valueOf(100.00))
                .duracaoMinutos(60)
                .ativo(true)
                .build();
        servico = servicoRepository.save(servico);

        Usuario usuarioAtendente = Usuario.builder()
                .email("atendente@test.com")
                .senha(passwordEncoder.encode("senha123"))
                .nome("Atendente")
                .perfil(Perfil.ATENDENTE)
                .ativo(true)
                .build();
        usuarioAtendente = usuarioRepository.save(usuarioAtendente);

        atendente = Atendente.builder()
                .nomeUsuario("Atendente Test")
                .unidade(unidade)
                .usuario(usuarioAtendente)
                .servicos(Collections.singletonList(servico))
                .ativo(true)
                .build();
        atendente = atendenteRepository.save(atendente);

        cliente = Cliente.builder()
                .nome("Cliente Test")
                .cpfCnpj("12345678900")
                .email("cliente@test.com")
                .telefone("11999999999")
                .build();
        cliente = clienteRepository.save(cliente);
    }

    @Test
    void deveCriarAgendamentoComSucesso() throws Exception {
        AgendamentoServicoDTO servicoDTO = AgendamentoServicoDTO.builder()
                .servicoId(servico.getId())
                .quantidade(1)
                .valor(servico.getValor())
                .descricao(servico.getDescricao())
                .build();

        AgendamentoDTO agendamentoDTO = AgendamentoDTO.builder()
                .clienteId(cliente.getId())
                .unidadeId(unidade.getId())
                .atendenteId(atendente.getId())
                .dataHoraInicio(LocalDateTime.now().plusDays(1))
                .observacoes("Observação de teste")
                .servicos(Collections.singletonList(servicoDTO))
                .build();

        mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(agendamentoDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.clienteId").value(cliente.getId()))
                .andExpect(jsonPath("$.status").value("AGENDADO"));
    }

    @Test
    void deveListarAgendamentos() throws Exception {
        // Criar agendamento primeiro
        Agendamento agendamento = Agendamento.builder()
                .cliente(cliente)
                .unidade(unidade)
                .atendente(atendente)
                .dataHoraInicio(LocalDateTime.now().plusDays(1))
                .dataHoraFim(LocalDateTime.now().plusDays(1).plusHours(1))
                .valorTotal(BigDecimal.valueOf(100.00))
                .status(StatusAgendamento.AGENDADO)
                .build();
        agendamentoRepository.save(agendamento);

        mockMvc.perform(get("/api/agendamentos")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").exists());
    }

    @Test
    void deveFinalizarAgendamento() throws Exception {
        // Criar agendamento
        Agendamento agendamento = Agendamento.builder()
                .cliente(cliente)
                .unidade(unidade)
                .atendente(atendente)
                .dataHoraInicio(LocalDateTime.now().minusDays(1))
                .dataHoraFim(LocalDateTime.now().minusDays(1).plusHours(1))
                .valorTotal(BigDecimal.valueOf(100.00))
                .status(StatusAgendamento.AGENDADO)
                .build();
        agendamento = agendamentoRepository.save(agendamento);

        FinalizarAgendamentoDTO finalizarDTO = FinalizarAgendamentoDTO.builder()
                .valorFinal(BigDecimal.valueOf(120.00))
                .build();

        mockMvc.perform(post("/api/agendamentos/" + agendamento.getId() + "/finalizar")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finalizarDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONCLUIDO"))
                .andExpect(jsonPath("$.valorFinal").value(120.00));
    }

    @Test
    void deveRetornarErroQuandoServicosNaoInformados() throws Exception {
        AgendamentoDTO agendamentoDTO = AgendamentoDTO.builder()
                .clienteId(cliente.getId())
                .unidadeId(unidade.getId())
                .atendenteId(atendente.getId())
                .dataHoraInicio(LocalDateTime.now().plusDays(1))
                .servicos(Collections.emptyList())
                .build();

        mockMvc.perform(post("/api/agendamentos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(agendamentoDTO)))
                .andExpect(status().isBadRequest());
    }
}

