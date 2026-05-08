package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.InsightSemanal;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.InsightSemanalRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InsightAgendadoService {

    private final AgendamentoRepository agendamentoRepository;
    private final InsightSemanalRepository insightSemanalRepository;
    private final UnidadeRepository unidadeRepository;
    private final IaService iaService;

    // ── IA-2: Roda toda segunda-feira às 08h ──────────────────────────────────

    @Scheduled(cron = "0 0 8 * * MON")
    @Transactional
    public void gerarInsightsSemanal() {
        LocalDate semana = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDateTime inicioSemana = semana.minusWeeks(1).atStartOfDay();
        LocalDateTime fimSemana = semana.atStartOfDay();

        unidadeRepository.findByAtivoTrue().forEach(unidade -> {
            if (insightSemanalRepository.findByUnidadeIdAndSemana(unidade.getId(), semana).isPresent()) return;

            List<Agendamento> semanaAgendamentos = agendamentoRepository
                    .findByUnidadeIdAndPeriodo(unidade.getId(), inicioSemana)
                    .stream()
                    .filter(a -> a.getDataHoraInicio().isBefore(fimSemana))
                    .collect(Collectors.toList());

            long total = semanaAgendamentos.size();
            long concluidos = semanaAgendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                    .count();
            long noShows = semanaAgendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.NO_SHOW)
                    .count();
            BigDecimal faturamento = semanaAgendamentos.stream()
                    .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                    .map(a -> a.getValorFinal() != null ? a.getValorFinal() : a.getValorTotal())
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            String dados = String.format(
                    "Unidade: %s | Semana: %s a %s | Agendamentos: %d | Concluídos: %d | No-shows: %d | Faturamento: R$ %.2f",
                    unidade.getNome(),
                    inicioSemana.toLocalDate(), fimSemana.toLocalDate().minusDays(1),
                    total, concluidos, noShows, faturamento
            );

            String texto = iaService.gerarInsightSemanal(dados);
            if (texto.isBlank()) texto = dados;

            insightSemanalRepository.save(InsightSemanal.builder()
                    .unidadeId(unidade.getId())
                    .semana(semana)
                    .texto(texto)
                    .build());

            log.info("Insight semanal gerado para unidade {} semana {}", unidade.getNome(), semana);
        });
    }

    // ── IA-3: Clientes em risco de churn (ausentes > 30 dias) ────────────────

    public record ClienteRiscoDTO(
            Long clienteId,
            String clienteNome,
            int diasAusente,
            String ultimoServico,
            String mensagemSugerida
    ) {}

    public List<ClienteRiscoDTO> clientesEmRisco(Long unidadeId) {
        LocalDateTime corte = LocalDateTime.now().minusDays(30);
        LocalDateTime inicio = LocalDateTime.now().minusMonths(6);

        List<Agendamento> historico = unidadeId != null
                ? agendamentoRepository.findByUnidadeIdAndPeriodo(unidadeId, inicio)
                : agendamentoRepository.findByPeriodo(inicio, LocalDateTime.now());

        // Último agendamento por cliente
        Map<Long, Agendamento> ultimoPorCliente = new LinkedHashMap<>();
        historico.stream()
                .filter(a -> a.getCliente() != null && a.getStatus() == StatusAgendamento.CONCLUIDO)
                .forEach(a -> {
                    Long cid = a.getCliente().getId();
                    if (!ultimoPorCliente.containsKey(cid) ||
                            a.getDataHoraInicio().isAfter(ultimoPorCliente.get(cid).getDataHoraInicio())) {
                        ultimoPorCliente.put(cid, a);
                    }
                });

        return ultimoPorCliente.values().stream()
                .filter(a -> a.getDataHoraInicio().isBefore(corte))
                .sorted(Comparator.comparing(Agendamento::getDataHoraInicio))
                .limit(20)
                .map(a -> {
                    int dias = (int) java.time.temporal.ChronoUnit.DAYS.between(
                            a.getDataHoraInicio().toLocalDate(), LocalDate.now());
                    String ultimoServico = a.getServicos() != null && !a.getServicos().isEmpty()
                            ? a.getServicos().get(0).getServico().getNome()
                            : "serviço";
                    String nomeNegocio = unidadeId != null
                            ? unidadeRepository.findById(unidadeId).map(u -> u.getNome()).orElse("nossa empresa")
                            : "nossa empresa";
                    String msg = iaService.gerarMensagemReengajamento(
                            a.getCliente().getNome(), nomeNegocio, dias, ultimoServico);
                    return new ClienteRiscoDTO(
                            a.getCliente().getId(), a.getCliente().getNome(), dias, ultimoServico, msg);
                })
                .collect(Collectors.toList());
    }

    // ── IA-7: Churn por profissional ──────────────────────────────────────────

    public record ProfissionalChurnDTO(
            Long atendenteId,
            String atendenteNome,
            long clientesRecorrentes90dias,
            long clientesRecorrentes30dias,
            double taxaChurn
    ) {}

    public List<ProfissionalChurnDTO> churnPorProfissional(Long unidadeId) {
        LocalDateTime inicio90 = LocalDateTime.now().minusDays(90);
        LocalDateTime inicio30 = LocalDateTime.now().minusDays(30);

        List<Agendamento> historico90 = unidadeId != null
                ? agendamentoRepository.findByUnidadeIdAndPeriodo(unidadeId, inicio90)
                : agendamentoRepository.findByPeriodo(inicio90, LocalDateTime.now());

        // Agrupa por atendente
        Map<Long, List<Agendamento>> porAtendente = historico90.stream()
                .filter(a -> a.getAtendente() != null && a.getCliente() != null)
                .collect(Collectors.groupingBy(a -> a.getAtendente().getId()));

        return porAtendente.entrySet().stream().map(e -> {
            List<Agendamento> ags = e.getValue();
            String nome = ags.get(0).getAtendente().getNomeUsuario() != null
                    ? ags.get(0).getAtendente().getNomeUsuario()
                    : ags.get(0).getAtendente().getNome();

            // Clientes únicos nos últimos 90 dias
            Set<Long> clientes90 = ags.stream().map(a -> a.getCliente().getId()).collect(Collectors.toSet());

            // Clientes únicos nos últimos 30 dias
            Set<Long> clientes30 = ags.stream()
                    .filter(a -> a.getDataHoraInicio().isAfter(inicio30))
                    .map(a -> a.getCliente().getId())
                    .collect(Collectors.toSet());

            // Taxa de churn = (clientes90 - clientes30) / clientes90
            long perdidos = clientes90.stream().filter(c -> !clientes30.contains(c)).count();
            double taxa = clientes90.size() > 0 ? (double) perdidos / clientes90.size() * 100 : 0.0;

            return new ProfissionalChurnDTO(e.getKey(), nome, clientes90.size(), clientes30.size(), taxa);
        })
        .filter(dto -> dto.taxaChurn() >= 30) // Alerta apenas para churn >= 30%
        .sorted(Comparator.comparingDouble(ProfissionalChurnDTO::taxaChurn).reversed())
        .collect(Collectors.toList());
    }
}
