package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InteligenciaService {

    private final AgendamentoRepository agendamentoRepository;

    public record HorarioPopularDTO(
            int hora,
            int diaSemana,
            long total,
            long noShows,
            double taxaNoShow,
            boolean popular
    ) {}

    public record NoShowRiscoDTO(
            Long agendamentoId,
            String clienteNome,
            LocalDateTime dataHoraInicio,
            int scoreRisco,
            String nivelRisco
    ) {}

    public record ServicoComplementarDTO(
            Long servicoId,
            String servicoNome,
            long coOcorrencias,
            double percentual
    ) {}

    // ── IA-6: Horários populares ──────────────────────────────────────────────

    public List<HorarioPopularDTO> horariosPopulares(Long unidadeId) {
        LocalDateTime inicio = LocalDateTime.now().minusMonths(3);
        List<Object[]> rows = unidadeId != null
                ? agendamentoRepository.findHorariosPopularesPorUnidade(unidadeId, inicio)
                : agendamentoRepository.findHorariosPopularesGlobal(inicio);

        if (rows.isEmpty()) return List.of();

        long maxTotal = ((Number) rows.get(0)[2]).longValue();
        long limiarPopular = Math.max(1, maxTotal / 2);

        return rows.stream().map(row -> {
            int hora = ((Number) row[0]).intValue();
            int diaSemana = ((Number) row[1]).intValue();
            long total = ((Number) row[2]).longValue();
            long noShows = ((Number) row[3]).longValue();
            double taxa = total > 0 ? (double) noShows / total : 0.0;
            return new HorarioPopularDTO(hora, diaSemana, total, noShows, taxa, total >= limiarPopular);
        }).collect(Collectors.toList());
    }

    // ── IA-1: Previsão de no-show ─────────────────────────────────────────────

    public List<NoShowRiscoDTO> calcularRiscoNoShow(Long unidadeId) {
        LocalDateTime inicio = LocalDateTime.now().minusMonths(6);
        List<Agendamento> proximos = unidadeId != null
                ? agendamentoRepository.findByUnidadeIdAndPeriodo(unidadeId, LocalDateTime.now())
                : agendamentoRepository.findByPeriodo(LocalDateTime.now(), LocalDateTime.now().plusDays(7));

        List<Agendamento> historico = unidadeId != null
                ? agendamentoRepository.findByUnidadeIdAndPeriodo(unidadeId, inicio)
                : agendamentoRepository.findByPeriodo(inicio, LocalDateTime.now());

        // No-show rate por cliente
        Map<Long, long[]> clienteStats = new HashMap<>();
        for (Agendamento a : historico) {
            if (a.getCliente() == null) continue;
            long[] stats = clienteStats.computeIfAbsent(a.getCliente().getId(), k -> new long[]{0, 0});
            stats[0]++;
            if (a.getStatus() == StatusAgendamento.NO_SHOW) stats[1]++;
        }

        // No-show rate por hora
        Map<Integer, long[]> horaStats = new HashMap<>();
        for (Agendamento a : historico) {
            int hora = a.getDataHoraInicio().getHour();
            long[] stats = horaStats.computeIfAbsent(hora, k -> new long[]{0, 0});
            stats[0]++;
            if (a.getStatus() == StatusAgendamento.NO_SHOW) stats[1]++;
        }

        return proximos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.AGENDADO || a.getStatus() == StatusAgendamento.CONFIRMADO)
                .map(a -> {
                    int score = calcularScore(a, clienteStats, horaStats);
                    String nivel = score >= 70 ? "ALTO" : score >= 40 ? "MEDIO" : "BAIXO";
                    String nome = a.getCliente() != null ? a.getCliente().getNome() : "Desconhecido";
                    return new NoShowRiscoDTO(a.getId(), nome, a.getDataHoraInicio(), score, nivel);
                })
                .filter(dto -> !dto.nivelRisco().equals("BAIXO"))
                .sorted(Comparator.comparingInt(NoShowRiscoDTO::scoreRisco).reversed())
                .collect(Collectors.toList());
    }

    private int calcularScore(Agendamento a,
                               Map<Long, long[]> clienteStats,
                               Map<Integer, long[]> horaStats) {
        int score = 0;

        // Histórico do cliente (peso 50%)
        if (a.getCliente() != null) {
            long[] cs = clienteStats.get(a.getCliente().getId());
            if (cs != null && cs[0] >= 2) {
                double taxa = (double) cs[1] / cs[0];
                score += (int) (taxa * 50);
            }
        }

        // Taxa de no-show da hora (peso 30%)
        int hora = a.getDataHoraInicio().getHour();
        long[] hs = horaStats.get(hora);
        if (hs != null && hs[0] >= 3) {
            double taxa = (double) hs[1] / hs[0];
            score += (int) (taxa * 30);
        }

        // Dia da semana: segunda e sexta têm mais no-show (peso 20%)
        int dow = a.getDataHoraInicio().getDayOfWeek().getValue();
        if (dow == 1 || dow == 5) score += 15;
        else if (dow == 6 || dow == 7) score += 10;

        return Math.min(100, score);
    }

    // ── IA-5: Serviços complementares ─────────────────────────────────────────

    public List<ServicoComplementarDTO> servicosComplementares(Long servicoId) {
        // Busca agendamentos que contêm o serviço base nos últimos 6 meses
        LocalDateTime inicio = LocalDateTime.now().minusMonths(6);
        List<Agendamento> agendamentos = agendamentoRepository.findByPeriodo(inicio, LocalDateTime.now());

        // Mapa: agendamentoId → lista de servicoIds
        Map<Long, Set<Long>> agendServicos = new HashMap<>();
        for (Agendamento a : agendamentos) {
            if (a.getServicos() == null) continue;
            Set<Long> ids = a.getServicos().stream()
                    .filter(s -> s.getServico() != null)
                    .map(s -> s.getServico().getId())
                    .collect(Collectors.toSet());
            agendServicos.put(a.getId(), ids);
        }

        // Filtra agendamentos que têm o serviço base
        Set<Long> agendComServico = agendServicos.entrySet().stream()
                .filter(e -> e.getValue().contains(servicoId))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        if (agendComServico.isEmpty()) return List.of();

        // Conta co-ocorrências
        Map<Long, Long> coOcorrencias = new HashMap<>();
        for (Long agendId : agendComServico) {
            Set<Long> outros = agendServicos.getOrDefault(agendId, Set.of());
            for (Long outroId : outros) {
                if (!outroId.equals(servicoId)) {
                    coOcorrencias.merge(outroId, 1L, Long::sum);
                }
            }
        }

        long base = agendComServico.size();
        return coOcorrencias.entrySet().stream()
                .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> {
                    // Nome do serviço buscado inline
                    String nome = agendamentos.stream()
                            .flatMap(a -> a.getServicos() == null ? java.util.stream.Stream.empty() : a.getServicos().stream())
                            .filter(s -> s.getServico() != null && s.getServico().getId().equals(e.getKey()))
                            .map(s -> s.getServico().getNome())
                            .findFirst()
                            .orElse("Serviço " + e.getKey());
                    return new ServicoComplementarDTO(e.getKey(), nome, e.getValue(),
                            (double) e.getValue() / base * 100);
                })
                .collect(Collectors.toList());
    }
}
