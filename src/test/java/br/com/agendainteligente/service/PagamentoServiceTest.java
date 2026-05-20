package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusPagamento;
import br.com.agendainteligente.domain.enums.TipoPagamento;
import br.com.agendainteligente.dto.PagamentoDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PagamentoMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.PagamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PagamentoServiceTest {

    @Mock private PagamentoRepository pagamentoRepository;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private PagamentoMapper pagamentoMapper;

    @InjectMocks private PagamentoService pagamentoService;

    private Agendamento agendamento;

    @BeforeEach
    void setUp() {
        agendamento = Agendamento.builder()
                .id(1L)
                .status(StatusAgendamento.AGENDADO)
                .valorTotal(BigDecimal.valueOf(200.00))
                .valorFinal(null)
                .build();
        when(pagamentoMapper.toDTO(any(Pagamento.class))).thenReturn(new PagamentoDTO());
    }

    @Test
    void buscarPorAgendamentoId_lancaResourceNotFoundQuandoAusente() {
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> pagamentoService.buscarPorAgendamentoId(1L));
    }

    @Test
    void registrarPagamento_sucesso_atualizaValorFinal() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.empty());
        when(pagamentoRepository.save(any(Pagamento.class))).thenAnswer(i -> i.getArgument(0));

        pagamentoService.registrarPagamento(1L, TipoPagamento.DINHEIRO, BigDecimal.valueOf(50), LocalDate.of(2026, 5, 11));

        assertEquals(BigDecimal.valueOf(50), agendamento.getValorFinal());
        verify(pagamentoRepository).save(argThat(p ->
                p.getStatus() == StatusPagamento.APROVADO
                        && p.getValor().compareTo(BigDecimal.valueOf(50)) == 0
                        && p.getTipoPagamento() == TipoPagamento.DINHEIRO
        ));
    }

    @Test
    void registrarPagamento_recusaQuandoCancelado() {
        agendamento.setStatus(StatusAgendamento.CANCELADO);
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () ->
                pagamentoService.registrarPagamento(1L, TipoPagamento.DINHEIRO, BigDecimal.TEN, LocalDate.now()));
        verify(pagamentoRepository, never()).save(any());
    }

    @Test
    void registrarPagamento_recusaValorZero() {
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () ->
                pagamentoService.registrarPagamento(1L, TipoPagamento.PIX, BigDecimal.ZERO, LocalDate.now()));
    }

    @Test
    void registrarPagamento_recusaQuandoExcedeTotal() {
        agendamento.setValorFinal(BigDecimal.valueOf(150));
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        // 150 já pago + 100 novo > 200 total
        assertThrows(BusinessException.class, () ->
                pagamentoService.registrarPagamento(1L, TipoPagamento.PIX, BigDecimal.valueOf(100), LocalDate.now()));
    }

    @Test
    void ajustarPagamento_paraZero_removePagamentoEZeraValorFinal() {
        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento.setValorFinal(BigDecimal.valueOf(80));
        Pagamento existente = Pagamento.builder().id(10L).agendamento(agendamento).valor(BigDecimal.valueOf(80)).build();
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        when(pagamentoRepository.findByAgendamentoId(1L)).thenReturn(Optional.of(existente));

        // ajuste = 80, removerValor=true → novoTotal = 0 → remove
        pagamentoService.ajustarPagamento(1L, TipoPagamento.DINHEIRO, BigDecimal.valueOf(80), LocalDate.now(), true);

        verify(pagamentoRepository).delete(existente);
        assertNull(agendamento.getValorFinal());
        assertNull(agendamento.getPagamento());
    }

    @Test
    void ajustarPagamento_recusaSeAgendamentoNaoConfirmado() {
        // agendamento ainda em AGENDADO
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () ->
                pagamentoService.ajustarPagamento(1L, TipoPagamento.PIX, BigDecimal.TEN, LocalDate.now(), false));
    }

    @Test
    void processarPagamento_recusaSeJaTotalmentePago() {
        agendamento.setStatus(StatusAgendamento.CONFIRMADO);
        agendamento.setValorFinal(BigDecimal.valueOf(200)); // == valorTotal
        when(agendamentoRepository.findById(1L)).thenReturn(Optional.of(agendamento));
        assertThrows(BusinessException.class, () ->
                pagamentoService.processarPagamento(1L, TipoPagamento.PIX));
    }

    @Test
    void confirmarPagamento_promoveStatusEAtualizaAgendamento() {
        Pagamento pagamento = Pagamento.builder()
                .id(10L)
                .agendamento(agendamento)
                .valor(BigDecimal.valueOf(200))
                .status(StatusPagamento.PROCESSANDO)
                .build();
        when(pagamentoRepository.findByIdTransacaoGateway("tx-1")).thenReturn(Optional.of(pagamento));

        pagamentoService.confirmarPagamento("tx-1");

        assertEquals(StatusPagamento.APROVADO, pagamento.getStatus());
        assertEquals(StatusAgendamento.CONFIRMADO, agendamento.getStatus());
        assertEquals(BigDecimal.valueOf(200), agendamento.getValorFinal());
    }

    @Test
    void confirmarPagamento_noopSeJaAprovado() {
        Pagamento pagamento = Pagamento.builder()
                .id(10L)
                .agendamento(agendamento)
                .status(StatusPagamento.APROVADO)
                .build();
        when(pagamentoRepository.findByIdTransacaoGateway("tx-1")).thenReturn(Optional.of(pagamento));

        pagamentoService.confirmarPagamento("tx-1");

        verify(pagamentoRepository, never()).save(any());
        verify(agendamentoRepository, never()).save(any());
    }
}
