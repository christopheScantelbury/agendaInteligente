package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.AgendamentoMapper;
import br.com.agendainteligente.mapper.AgendamentoServicoMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AgendamentoServicoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.GerenteRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import br.com.agendainteligente.repository.PagamentoRepository;
import br.com.agendainteligente.repository.ServicoRepository;
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

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Cobre os caminhos críticos e mais discretos de AgendamentoService:
 * cancelar, excluir, atualizarObservacao. As ações maiores (criar,
 * atualizar, atualizarStatus state-machine) seguem cobertas em
 * AgendamentoControllerIntegrationTest — duplicar aqui daria pouco valor.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AgendamentoServiceTest {

    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private AgendamentoServicoRepository agendamentoServicoRepository;
    @Mock private ClienteRepository clienteRepository;
    @Mock private ServicoRepository servicoRepository;
    @Mock private UnidadeRepository unidadeRepository;
    @Mock private AtendenteRepository atendenteRepository;
    @Mock private GerenteRepository gerenteRepository;
    @Mock private AgendamentoRecorrenteService agendamentoRecorrenteService;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AgendamentoMapper agendamentoMapper;
    @Mock private AgendamentoServicoMapper agendamentoServicoMapper;
    @Mock private NotaFiscalService notaFiscalService;
    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private NotaFiscalRepository notaFiscalRepository;
    @Mock private LembreteAgendadoService lembreteAgendadoService;

    @InjectMocks private AgendamentoService service;

    private Agendamento agendamento;

    @BeforeEach
    void setUp() {
        TestSecurityContext.authenticateAs("admin@test.com", "ROLE_ADMIN");
        Usuario admin = Usuario.builder()
                .id(1L).email("admin@test.com").nome("Admin")
                .perfilSistema(PerfilUsuario.ADMIN).ativo(true).build();
        when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));

        agendamento = Agendamento.builder()
                .id(1L)
                .status(StatusAgendamento.AGENDADO)
                .valorTotal(BigDecimal.valueOf(100))
                .build();
    }

    @AfterEach
    void tearDown() {
        TestSecurityContext.clear();
    }

    // ── cancelar ─────────────────────────────────────────────────────────────

    @Test
    void cancelar_sucesso_marcaComoCancelado() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoRepository.save(any(Agendamento.class))).thenAnswer(i -> i.getArgument(0));

        service.cancelar(1L);

        assertEquals(StatusAgendamento.CANCELADO, agendamento.getStatus());
        verify(agendamentoRepository).save(agendamento);
    }

    @Test
    void cancelar_ausente_lancaResourceNotFound() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.cancelar(1L));
        verify(agendamentoRepository, never()).save(any());
    }

    @Test
    void cancelar_jaCancelado_lanca() {
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () -> service.cancelar(1L));
    }

    @Test
    void cancelar_concluido_lanca() {
        agendamento.setStatus(StatusAgendamento.CONCLUIDO);
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () -> service.cancelar(1L));
    }

    @Test
    void cancelar_noShow_lanca() {
        agendamento.setStatus(StatusAgendamento.NO_SHOW);
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () -> service.cancelar(1L));
    }

    // ── excluir ──────────────────────────────────────────────────────────────

    @Test
    void excluir_sucesso_semSinal_apagaCascata() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.empty());

        service.excluir(1L);

        verify(agendamentoServicoRepository).deleteByAgendamentoId(1L);
        verify(pagamentoRepository).deleteByAgendamentoId(1L);
        verify(notaFiscalRepository).deleteByAgendamentoId(1L);
        verify(agendamentoRepository).deleteById(1L);
    }

    @Test
    void excluir_comSinalNoAgendamento_lanca() {
        agendamento.setValorFinal(BigDecimal.valueOf(50));
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () -> service.excluir(1L));
        assertTrue(ex.getMessage().contains("sinal pago"));
        verify(agendamentoRepository, never()).deleteById(any());
    }

    @Test
    void excluir_comSinalEmPagamentoSeparado_lanca() {
        Pagamento pagamento = Pagamento.builder()
                .id(10L).agendamento(agendamento).valor(BigDecimal.valueOf(30)).build();
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.of(pagamento));

        assertThrows(BusinessException.class, () -> service.excluir(1L));
        verify(agendamentoRepository, never()).deleteById(any());
    }

    @Test
    void excluir_ausente_lancaResourceNotFound() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.excluir(1L));
    }

    // ── atualizarObservacao ──────────────────────────────────────────────────

    @Test
    void atualizarObservacao_sucesso() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(agendamentoRepository.save(any(Agendamento.class))).thenAnswer(i -> i.getArgument(0));
        when(agendamentoMapper.toDTO(any(Agendamento.class))).thenReturn(new AgendamentoDTO());

        AgendamentoDTO result = service.atualizarObservacao(1L, "Cliente alérgico a perfume");

        assertNotNull(result);
        assertEquals("Cliente alérgico a perfume", agendamento.getObservacoes());
        verify(agendamentoRepository).save(agendamento);
    }

    @Test
    void atualizarObservacao_ausente_lancaResourceNotFound() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () ->
                service.atualizarObservacao(1L, "qualquer"));
    }
}
