package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.ConviteAcesso;
import br.com.agendainteligente.domain.entity.ConviteCliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.dto.ConviteAcessoCriarDTO;
import br.com.agendainteligente.dto.ConviteAcessoInfoDTO;
import br.com.agendainteligente.dto.ConviteAcessoRespostaDTO;
import br.com.agendainteligente.dto.ConviteClienteCriarDTO;
import br.com.agendainteligente.dto.ConviteClienteInfoDTO;
import br.com.agendainteligente.dto.ConviteClienteRespostaDTO;
import br.com.agendainteligente.dto.FinalizarCadastroAdministradorDTO;
import br.com.agendainteligente.dto.UnidadeMinimaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.ConviteAcessoRepository;
import br.com.agendainteligente.repository.ConviteClienteRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.GerenteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.test.TestSecurityContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ConviteServiceTest {

    @Mock private ConviteAcessoRepository conviteAcessoRepository;
    @Mock private ConviteClienteRepository conviteClienteRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private UnidadeRepository unidadeRepository;
    @Mock private GerenteRepository gerenteRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PerfilService perfilService;

    @InjectMocks private ConviteService service;

    private Usuario admin;
    private Usuario gerente;
    private Unidade unidade;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "urlBase", "http://localhost:5173");

        admin = Usuario.builder()
                .id(1L).email("admin@test.com").nome("Admin")
                .perfilSistema(PerfilUsuario.ADMIN).ativo(true).build();
        unidade = Unidade.builder().id(10L).nome("Unidade A").build();
        gerente = Usuario.builder()
                .id(2L).email("ger@test.com").nome("Gerente")
                .perfilSistema(PerfilUsuario.GERENTE).ativo(true)
                .unidades(List.of(unidade)).build();
    }

    @AfterEach
    void tearDown() {
        TestSecurityContext.clear();
    }

    // ── criarConviteAcesso ───────────────────────────────────────────────────

    @Test
    void criarConviteAcesso_admin_sucesso() {
        TestSecurityContext.authenticateAs("admin@test.com", "ROLE_ADMIN");
        when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        ConviteAcessoCriarDTO dto = ConviteAcessoCriarDTO.builder()
                .maxUnidades(3)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(7))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.save(any(ConviteAcesso.class))).thenAnswer(i -> {
            ConviteAcesso c = i.getArgument(0);
            c.setId(100L);
            return c;
        });

        ConviteAcessoRespostaDTO out = service.criarConviteAcesso(dto);

        assertEquals(100L, out.getId());
        assertNotNull(out.getToken());
        assertTrue(out.getLink().contains(out.getToken()));
        assertEquals(3, out.getMaxUnidades());
    }

    @Test
    void criarConviteAcesso_naoAdmin_semPermissao_lanca() {
        TestSecurityContext.authenticateAs("ger@test.com", "ROLE_GERENTE");
        when(usuarioRepository.findByEmail("ger@test.com")).thenReturn(Optional.of(gerente));
        // PerfilService retorna sem permissão granular
        when(perfilService.buscarPerfilDoUsuarioLogado())
                .thenThrow(new RuntimeException("sem perfil"));

        ConviteAcessoCriarDTO dto = ConviteAcessoCriarDTO.builder()
                .maxUnidades(1)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(1))
                .dataExpiracaoAcesso(LocalDate.now().plusMonths(1))
                .build();

        assertThrows(BusinessException.class, () -> service.criarConviteAcesso(dto));
        verify(conviteAcessoRepository, never()).save(any());
    }

    @Test
    void criarConviteAcesso_dataLinkNoPassado_lanca() {
        TestSecurityContext.authenticateAs("admin@test.com", "ROLE_ADMIN");
        when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        ConviteAcessoCriarDTO dto = ConviteAcessoCriarDTO.builder()
                .maxUnidades(1)
                .dataExpiracaoLink(LocalDateTime.now().minusDays(1))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();

        BusinessException ex = assertThrows(BusinessException.class, () -> service.criarConviteAcesso(dto));
        assertTrue(ex.getMessage().contains("Data de expiração do link"));
    }

    // ── obterInfoConviteAcesso ───────────────────────────────────────────────

    @Test
    void obterInfoConviteAcesso_tokenInexistente_retornaInvalido() {
        when(conviteAcessoRepository.findByToken("xxx")).thenReturn(Optional.empty());
        ConviteAcessoInfoDTO info = service.obterInfoConviteAcesso("xxx");
        assertFalse(info.isValido());
        assertNotNull(info.getMensagemErro());
    }

    @Test
    void obterInfoConviteAcesso_jaUsado_retornaInvalido() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(1)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(1))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .usadoEm(LocalDateTime.now()) // usado!
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));
        ConviteAcessoInfoDTO info = service.obterInfoConviteAcesso("tok");
        assertFalse(info.isValido());
        assertTrue(info.getMensagemErro().toLowerCase().contains("utilizado"));
    }

    @Test
    void obterInfoConviteAcesso_linkExpirado_retornaInvalido() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(1)
                .dataExpiracaoLink(LocalDateTime.now().minusDays(1)) // expirado
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));
        ConviteAcessoInfoDTO info = service.obterInfoConviteAcesso("tok");
        assertFalse(info.isValido());
        assertTrue(info.getMensagemErro().toLowerCase().contains("expirou"));
    }

    @Test
    void obterInfoConviteAcesso_valido_retornaTrue() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(2)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(7))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));
        ConviteAcessoInfoDTO info = service.obterInfoConviteAcesso("tok");
        assertTrue(info.isValido());
        assertNull(info.getMensagemErro());
        assertEquals(2, info.getMaxUnidades());
    }

    // ── finalizarCadastroAdministrador ─────────────────────────────────────────────

    @Test
    void finalizarCadastroAdministrador_tokenInvalido_lanca() {
        when(conviteAcessoRepository.findByToken("xxx")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () ->
                service.finalizarCadastroAdministrador("xxx", new FinalizarCadastroAdministradorDTO()));
    }

    @Test
    void finalizarCadastroAdministrador_unidadesAcimaDoLimite_lanca() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(1)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(7))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));

        FinalizarCadastroAdministradorDTO dto = new FinalizarCadastroAdministradorDTO();
        dto.setNome("Fulano");
        dto.setEmail("f@x.com");
        dto.setSenha("123456");
        dto.setNomeEmpresa("X");
        dto.setUnidades(List.of(
                UnidadeMinimaDTO.builder().nome("U1").build(),
                UnidadeMinimaDTO.builder().nome("U2").build()
        ));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                service.finalizarCadastroAdministrador("tok", dto));
        assertTrue(ex.getMessage().contains("excede"));
    }

    @Test
    void finalizarCadastroAdministrador_emailDuplicado_lanca() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(2)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(7))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));
        when(usuarioRepository.existsByEmail("dup@x.com")).thenReturn(true);

        FinalizarCadastroAdministradorDTO dto = new FinalizarCadastroAdministradorDTO();
        dto.setNome("Fulano"); dto.setEmail("dup@x.com"); dto.setSenha("123456");
        dto.setNomeEmpresa("X");
        dto.setUnidades(List.of(UnidadeMinimaDTO.builder().nome("U1").build()));

        assertThrows(BusinessException.class, () -> service.finalizarCadastroAdministrador("tok", dto));
        verify(empresaRepository, never()).save(any());
    }

    @Test
    void finalizarCadastroAdministrador_sucesso_criaEmpresaUnidadesUsuarioEGerente() {
        ConviteAcesso convite = ConviteAcesso.builder()
                .token("tok").maxUnidades(2)
                .dataExpiracaoLink(LocalDateTime.now().plusDays(7))
                .dataExpiracaoAcesso(LocalDate.now().plusYears(1))
                .build();
        when(conviteAcessoRepository.findByToken("tok")).thenReturn(Optional.of(convite));
        when(usuarioRepository.existsByEmail(any())).thenReturn(false);
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(i -> {
            Empresa e = i.getArgument(0);
            e.setId(50L);
            return e;
        });
        when(unidadeRepository.save(any(Unidade.class))).thenAnswer(i -> {
            Unidade u = i.getArgument(0);
            u.setId(System.nanoTime());
            return u;
        });
        when(passwordEncoder.encode("123456")).thenReturn("hashed");
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(i -> i.getArgument(0));

        FinalizarCadastroAdministradorDTO dto = new FinalizarCadastroAdministradorDTO();
        dto.setNome("Fulano"); dto.setEmail("new@x.com"); dto.setSenha("123456");
        dto.setNomeEmpresa("Empresa X");
        dto.setUnidades(List.of(UnidadeMinimaDTO.builder().nome("U1").build()));

        service.finalizarCadastroAdministrador("tok", dto);

        verify(empresaRepository).save(argThat(e -> "Empresa X".equals(e.getNome())));
        verify(unidadeRepository).save(any(Unidade.class));
        verify(usuarioRepository).save(any(Usuario.class));
        verify(gerenteRepository).save(any());
        // Marca convite como usado
        assertNotNull(convite.getUsadoEm());
        verify(conviteAcessoRepository).save(convite);
    }

    // ── criarConviteCliente ──────────────────────────────────────────────────

    @Test
    void criarConviteCliente_gerente_sucesso() {
        TestSecurityContext.authenticateAs("ger@test.com", "ROLE_GERENTE");
        when(usuarioRepository.findByEmail("ger@test.com")).thenReturn(Optional.of(gerente));
        when(unidadeRepository.findById(10L)).thenReturn(Optional.of(unidade));
        when(conviteClienteRepository.save(any(ConviteCliente.class))).thenAnswer(i -> {
            ConviteCliente c = i.getArgument(0);
            c.setId(200L);
            return c;
        });

        ConviteClienteCriarDTO dto = ConviteClienteCriarDTO.builder()
                .unidadeId(10L)
                .dataExpiracao(LocalDateTime.now().plusDays(7))
                .build();

        ConviteClienteRespostaDTO out = service.criarConviteCliente(dto);
        assertEquals(200L, out.getId());
        assertEquals(10L, out.getUnidadeId());
        assertTrue(out.getLink().contains(out.getToken()));
    }

    @Test
    void criarConviteCliente_unidadeNaoPertenceAoGerente_lanca() {
        TestSecurityContext.authenticateAs("ger@test.com", "ROLE_GERENTE");
        when(usuarioRepository.findByEmail("ger@test.com")).thenReturn(Optional.of(gerente));
        Unidade outra = Unidade.builder().id(99L).nome("Outra").build();
        when(unidadeRepository.findById(99L)).thenReturn(Optional.of(outra));

        ConviteClienteCriarDTO dto = ConviteClienteCriarDTO.builder()
                .unidadeId(99L)
                .dataExpiracao(LocalDateTime.now().plusDays(7))
                .build();

        assertThrows(BusinessException.class, () -> service.criarConviteCliente(dto));
        verify(conviteClienteRepository, never()).save(any());
    }

    // ── obterInfoConviteCliente ──────────────────────────────────────────────

    @Test
    void obterInfoConviteCliente_tokenInexistente_retornaInvalido() {
        when(conviteClienteRepository.findByToken("xxx")).thenReturn(Optional.empty());
        ConviteClienteInfoDTO info = service.obterInfoConviteCliente("xxx");
        assertFalse(info.isValido());
    }

    @Test
    void obterInfoConviteCliente_valido_retornaTrue() {
        unidade.setEmpresa(Empresa.builder().id(50L).nome("E").build());
        ConviteCliente convite = ConviteCliente.builder()
                .token("tok").unidade(unidade)
                .dataExpiracao(LocalDateTime.now().plusDays(7))
                .build();
        when(conviteClienteRepository.findByToken("tok")).thenReturn(Optional.of(convite));

        ConviteClienteInfoDTO info = service.obterInfoConviteCliente("tok");
        assertTrue(info.isValido());
        assertEquals(10L, info.getUnidadeId());
        assertEquals("E", info.getEmpresaNome());
    }
}
