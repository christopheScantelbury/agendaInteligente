package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.HorarioDisponivel;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.HorarioDisponivelMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.HorarioDisponivelRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HorarioDisponivelServiceTest {

    @Mock private HorarioDisponivelRepository horarioDisponivelRepository;
    @Mock private AtendenteRepository atendenteRepository;
    @Mock private AgendamentoRepository agendamentoRepository;
    @Mock private HorarioDisponivelMapper horarioDisponivelMapper;

    @InjectMocks private HorarioDisponivelService service;

    private Atendente atendente;
    private HorarioDisponivelDTO dto;

    @BeforeEach
    void setUp() {
        atendente = Atendente.builder()
                .id(10L)
                .ativo(true)
                .build();
        dto = HorarioDisponivelDTO.builder()
                .dataHoraInicio(LocalDateTime.of(2026, 5, 12, 9, 0))
                .dataHoraFim(LocalDateTime.of(2026, 5, 12, 10, 0))
                .disponivel(true)
                .build();
        when(horarioDisponivelMapper.toEntity(any(HorarioDisponivelDTO.class)))
                .thenAnswer(i -> {
                    HorarioDisponivelDTO d = i.getArgument(0);
                    return HorarioDisponivel.builder()
                            .dataHoraInicio(d.getDataHoraInicio())
                            .dataHoraFim(d.getDataHoraFim())
                            .build();
                });
        when(horarioDisponivelMapper.toDTO(any(HorarioDisponivel.class))).thenReturn(dto);
    }

    @Test
    void criar_sucesso() {
        when(atendenteRepository.findById(10L)).thenReturn(Optional.of(atendente));
        when(horarioDisponivelRepository.findHorarioDisponivelPorAtendenteEPeriodo(eq(10L), any(), any()))
                .thenReturn(Optional.empty());
        when(horarioDisponivelRepository.save(any(HorarioDisponivel.class)))
                .thenAnswer(i -> {
                    HorarioDisponivel h = i.getArgument(0);
                    h.setId(99L);
                    return h;
                });

        HorarioDisponivelDTO result = service.criar(dto, 10L);

        assertNotNull(result);
        verify(horarioDisponivelRepository).save(argThat(h ->
                h.getAtendente() == atendente && Boolean.TRUE.equals(h.getDisponivel())
        ));
    }

    @Test
    void criar_lancaQuandoAtendenteInativo() {
        atendente.setAtivo(false);
        when(atendenteRepository.findById(10L)).thenReturn(Optional.of(atendente));
        assertThrows(BusinessException.class, () -> service.criar(dto, 10L));
        verify(horarioDisponivelRepository, never()).save(any());
    }

    @Test
    void criar_lancaQuandoFimAntesDoInicio() {
        dto.setDataHoraFim(dto.getDataHoraInicio().minusMinutes(30));
        when(atendenteRepository.findById(10L)).thenReturn(Optional.of(atendente));
        assertThrows(BusinessException.class, () -> service.criar(dto, 10L));
    }

    @Test
    void criar_lancaQuandoConflitoComOutroHorario() {
        when(atendenteRepository.findById(10L)).thenReturn(Optional.of(atendente));
        when(horarioDisponivelRepository.findHorarioDisponivelPorAtendenteEPeriodo(eq(10L), any(), any()))
                .thenReturn(Optional.of(HorarioDisponivel.builder().id(1L).build()));
        assertThrows(BusinessException.class, () -> service.criar(dto, 10L));
        verify(horarioDisponivelRepository, never()).save(any());
    }

    @Test
    void atualizar_lancaQuandoHorarioPertenceAOutroAtendente() {
        Atendente outro = Atendente.builder().id(99L).build();
        HorarioDisponivel horario = HorarioDisponivel.builder()
                .id(1L).atendente(outro)
                .dataHoraInicio(dto.getDataHoraInicio()).dataHoraFim(dto.getDataHoraFim())
                .build();
        when(horarioDisponivelRepository.findById(1L)).thenReturn(Optional.of(horario));

        assertThrows(BusinessException.class, () -> service.atualizar(1L, dto, 10L));
        verify(horarioDisponivelRepository, never()).save(any());
    }

    @Test
    void atualizar_sucesso_atualizaCampos() {
        HorarioDisponivel horario = HorarioDisponivel.builder()
                .id(1L).atendente(atendente)
                .dataHoraInicio(LocalDateTime.of(2026, 1, 1, 8, 0))
                .dataHoraFim(LocalDateTime.of(2026, 1, 1, 9, 0))
                .disponivel(true)
                .build();
        when(horarioDisponivelRepository.findById(1L)).thenReturn(Optional.of(horario));
        when(horarioDisponivelRepository.save(any(HorarioDisponivel.class))).thenAnswer(i -> i.getArgument(0));

        dto.setDisponivel(false);
        service.atualizar(1L, dto, 10L);

        assertEquals(dto.getDataHoraInicio(), horario.getDataHoraInicio());
        assertEquals(dto.getDataHoraFim(), horario.getDataHoraFim());
        assertFalse(horario.getDisponivel());
    }

    @Test
    void excluir_lancaResourceNotFoundQuandoAusente() {
        when(horarioDisponivelRepository.findById(1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.excluir(1L, 10L));
        verify(horarioDisponivelRepository, never()).delete(any());
    }

    @Test
    void excluir_lancaQuandoHorarioPertenceAOutroAtendente() {
        Atendente outro = Atendente.builder().id(99L).build();
        HorarioDisponivel horario = HorarioDisponivel.builder().id(1L).atendente(outro).build();
        when(horarioDisponivelRepository.findById(1L)).thenReturn(Optional.of(horario));
        assertThrows(BusinessException.class, () -> service.excluir(1L, 10L));
        verify(horarioDisponivelRepository, never()).delete(any());
    }

    @Test
    void listarPorAtendente_delegaAoRepositorio() {
        when(horarioDisponivelRepository.findByAtendenteId(10L))
                .thenReturn(java.util.List.of(HorarioDisponivel.builder().id(1L).atendente(atendente).build()));
        assertEquals(1, service.listarPorAtendente(10L).size());
        verify(horarioDisponivelRepository).findByAtendenteId(10L);
    }
}
