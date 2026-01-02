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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HorarioDisponivelService {

    private final HorarioDisponivelRepository horarioDisponivelRepository;
    private final AtendenteRepository atendenteRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final HorarioDisponivelMapper horarioDisponivelMapper;

    @Transactional(readOnly = true)
    public List<HorarioDisponivelDTO> listarPorAtendente(Long atendenteId) {
        log.debug("Listando horários disponíveis do atendente: {}", atendenteId);
        return horarioDisponivelRepository.findByAtendenteId(atendenteId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public HorarioDisponivelDTO criar(HorarioDisponivelDTO horarioDTO, Long atendenteId) {
        log.debug("Criando horário disponível para atendente: {}", atendenteId);
        
        Atendente atendente = atendenteRepository.findById(atendenteId)
                .orElseThrow(() -> new ResourceNotFoundException("Atendente não encontrado"));

        if (!atendente.getAtivo()) {
            throw new BusinessException("Atendente não está ativo");
        }

        // Validar que o horário de fim é depois do início
        if (horarioDTO.getDataHoraFim().isBefore(horarioDTO.getDataHoraInicio()) ||
            horarioDTO.getDataHoraFim().isEqual(horarioDTO.getDataHoraInicio())) {
            throw new BusinessException("Data/hora de fim deve ser posterior à data/hora de início");
        }

        // Validar que não há conflito com outros horários disponíveis
        if (horarioDisponivelRepository.findHorarioDisponivelPorAtendenteEPeriodo(
                atendenteId, horarioDTO.getDataHoraInicio(), horarioDTO.getDataHoraFim()).isPresent()) {
            throw new BusinessException("Já existe um horário disponível neste período");
        }

        HorarioDisponivel horario = horarioDisponivelMapper.toEntity(horarioDTO);
        horario.setAtendente(atendente);
        horario.setDisponivel(horarioDTO.getDisponivel() != null ? horarioDTO.getDisponivel() : true);
        
        horario = horarioDisponivelRepository.save(horario);
        log.info("Horário disponível criado com sucesso. ID: {}", horario.getId());
        
        return toDTO(horario);
    }

    @Transactional
    public HorarioDisponivelDTO atualizar(Long id, HorarioDisponivelDTO horarioDTO, Long atendenteId) {
        log.debug("Atualizando horário disponível ID: {} do atendente: {}", id, atendenteId);
        
        HorarioDisponivel horario = horarioDisponivelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Horário disponível não encontrado"));

        // Validar que o horário pertence ao atendente
        if (!horario.getAtendente().getId().equals(atendenteId)) {
            throw new BusinessException("Você não tem permissão para alterar este horário");
        }

        // Validar que o horário de fim é depois do início
        if (horarioDTO.getDataHoraFim().isBefore(horarioDTO.getDataHoraInicio()) ||
            horarioDTO.getDataHoraFim().isEqual(horarioDTO.getDataHoraInicio())) {
            throw new BusinessException("Data/hora de fim deve ser posterior à data/hora de início");
        }

        horario.setDataHoraInicio(horarioDTO.getDataHoraInicio());
        horario.setDataHoraFim(horarioDTO.getDataHoraFim());
        if (horarioDTO.getDisponivel() != null) {
            horario.setDisponivel(horarioDTO.getDisponivel());
        }
        if (horarioDTO.getObservacoes() != null) {
            horario.setObservacoes(horarioDTO.getObservacoes());
        }

        horario = horarioDisponivelRepository.save(horario);
        log.info("Horário disponível atualizado com sucesso. ID: {}", horario.getId());
        
        return toDTO(horario);
    }

    @Transactional
    public void excluir(Long id, Long atendenteId) {
        log.debug("Excluindo horário disponível ID: {} do atendente: {}", id, atendenteId);
        
        HorarioDisponivel horario = horarioDisponivelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Horário disponível não encontrado"));

        // Validar que o horário pertence ao atendente
        if (!horario.getAtendente().getId().equals(atendenteId)) {
            throw new BusinessException("Você não tem permissão para excluir este horário");
        }

        horarioDisponivelRepository.delete(horario);
        log.info("Horário disponível excluído com sucesso. ID: {}", id);
    }

    @Transactional(readOnly = true)
    public List<HorarioDisponivelDTO> buscarHorariosDisponiveis(Long unidadeId, Long servicoId, 
                                                                  LocalDate dataInicio, LocalDate dataFim) {
        log.debug("Buscando horários disponíveis - Unidade: {}, Serviço: {}, Período: {} a {}", 
                  unidadeId, servicoId, dataInicio, dataFim);
        
        // Buscar atendentes da unidade que prestam o serviço
        List<Atendente> atendentes = atendenteRepository.findByUnidadeIdAndAtivoTrue(unidadeId)
                .stream()
                .filter(atendente -> atendente.getServicos().stream()
                        .anyMatch(servico -> servico.getId().equals(servicoId) && servico.getAtivo()))
                .collect(Collectors.toList());
        
        if (atendentes.isEmpty()) {
            log.debug("Nenhum atendente encontrado para a unidade {} e serviço {}", unidadeId, servicoId);
            return List.of();
        }
        
        // Converter LocalDate para LocalDateTime (início e fim do dia)
        LocalDateTime dataHoraInicio = dataInicio.atStartOfDay();
        LocalDateTime dataHoraFim = dataFim.atTime(LocalTime.MAX);
        
        // Buscar horários disponíveis dos atendentes no período
        List<HorarioDisponivel> horariosDisponiveis = atendentes.stream()
                .flatMap(atendente -> horarioDisponivelRepository
                        .findByAtendenteAndPeriodo(atendente.getId(), dataHoraInicio, dataHoraFim)
                        .stream())
                .collect(Collectors.toList());
        
        // Filtrar horários que não têm conflito com agendamentos
        return horariosDisponiveis.stream()
                .filter(horario -> {
                    // Verificar se há conflito com agendamentos
                    return agendamentoRepository.findConflitoHorario(
                            horario.getAtendente().getId(),
                            horario.getDataHoraInicio(),
                            horario.getDataHoraFim()
                    ).isEmpty();
                })
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    private HorarioDisponivelDTO toDTO(HorarioDisponivel horario) {
        HorarioDisponivelDTO dto = horarioDisponivelMapper.toDTO(horario);
        if (horario.getAtendente() != null && horario.getAtendente().getUsuario() != null) {
            dto.setAtendenteNome(horario.getAtendente().getUsuario().getNome());
        }
        return dto;
    }
}
