package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Pagamento;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.domain.enums.StatusDespesa;
import br.com.agendainteligente.dto.FinanceiroDashboardDTO;
import br.com.agendainteligente.dto.FluxoCaixaDiarioDTO;
import br.com.agendainteligente.dto.PerformanceDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.DespesaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RelatorioService {

    private final AgendamentoRepository agendamentoRepository;
    private final DespesaRepository despesaRepository;
    private final AtendenteRepository atendenteRepository;
    private final UnidadeRepository unidadeRepository;
    private final UsuarioRepository usuarioRepository;

    // ============ DTOs antigos (preservados) ============

    public record FaturamentoMensalDTO(String mes, long totalAgendamentos, BigDecimal faturamento) {}
    public record TopServicoDTO(String servicoNome, long totalRealizados, BigDecimal receitaTotal) {}
    public record TaxaRetornoDTO(String mes, long clientesUnicos, long clientesRetorno, double taxaRetorno) {}

    public List<FaturamentoMensalDTO> faturamentoMensal(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findFaturamentoMensal(inicio, fim, unidadeId)
                .stream()
                .map(row -> new FaturamentoMensalDTO(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO))
                .collect(Collectors.toList());
    }

    public List<TopServicoDTO> topServicos(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findTopServicos(inicio, fim, unidadeId)
                .stream()
                .map(row -> new TopServicoDTO(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO))
                .collect(Collectors.toList());
    }

    public List<TaxaRetornoDTO> taxaRetorno(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findTaxaRetorno(inicio, fim, unidadeId)
                .stream()
                .map(row -> {
                    long unicos = ((Number) row[1]).longValue();
                    long retorno = ((Number) row[2]).longValue();
                    double taxa = unicos > 0 ? (double) retorno / unicos * 100 : 0.0;
                    return new TaxaRetornoDTO((String) row[0], unicos, retorno, taxa);
                })
                .collect(Collectors.toList());
    }

    // ============ Performance ============

    public PerformanceDTO performance(LocalDate inicio, LocalDate fim, Long atendenteId) {
        Set<Long> unidades = unidadesPermitidas();
        LocalDateTime inicioDt = inicio.atStartOfDay();
        LocalDateTime fimDt = fim.atTime(23, 59, 59);

        List<Agendamento> agendamentos = agendamentoRepository.findByPeriodo(inicioDt, fimDt).stream()
                .filter(a -> a.getUnidade() != null && unidades.contains(a.getUnidade().getId()))
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .filter(a -> atendenteId == null
                        || (a.getAtendente() != null && atendenteId.equals(a.getAtendente().getId())))
                .collect(Collectors.toList());

        BigDecimal receita = agendamentos.stream()
                .map(a -> a.getValorFinal() != null ? a.getValorFinal()
                        : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal despesa = atendenteId != null
                ? BigDecimal.ZERO
                : despesaRepository.somarPorStatusEPeriodo(unidades, StatusDespesa.PAGA, inicio, fim);

        long clientes = agendamentos.stream()
                .map(a -> a.getCliente() != null ? a.getCliente().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct().count();

        long horas = agendamentos.stream()
                .mapToLong(a -> {
                    if (a.getDataHoraInicio() == null || a.getDataHoraFim() == null) return 0;
                    return ChronoUnit.MINUTES.between(a.getDataHoraInicio(), a.getDataHoraFim());
                })
                .sum() / 60;

        String atendenteNome = null;
        if (atendenteId != null) {
            atendenteNome = atendenteRepository.findById(atendenteId)
                    .map(a -> a.getUsuario() != null ? a.getUsuario().getNome() : null)
                    .orElse(null);
        }

        return PerformanceDTO.builder()
                .inicio(inicio)
                .fim(fim)
                .diasNoPeriodo(ChronoUnit.DAYS.between(inicio, fim) + 1)
                .receita(receita)
                .despesa(despesa)
                .lucro(receita.subtract(despesa))
                .atendimentos(agendamentos.size())
                .clientesAtendidos(clientes)
                .horasAtendidas(horas)
                .atendenteId(atendenteId)
                .atendenteNome(atendenteNome)
                .build();
    }

    // ============ Financeiro Dashboard ============

    public FinanceiroDashboardDTO dashboardFinanceiro(int ano, Long unidadeIdFiltro) {
        Set<Long> permitidas = unidadesPermitidas();
        final Set<Long> unidades = (unidadeIdFiltro != null && permitidas.contains(unidadeIdFiltro))
                ? Set.of(unidadeIdFiltro) : permitidas;
        LocalDate inicioAno = LocalDate.of(ano, 1, 1);
        LocalDate fimAno = LocalDate.of(ano, 12, 31);

        List<Agendamento> agendamentosAno = agendamentoRepository.findByPeriodo(
                        inicioAno.atStartOfDay(), fimAno.atTime(23, 59, 59)).stream()
                .filter(a -> a.getUnidade() != null && unidades.contains(a.getUnidade().getId()))
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .collect(Collectors.toList());

        BigDecimal receitaTotal = agendamentosAno.stream()
                .map(a -> a.getValorFinal() != null ? a.getValorFinal()
                        : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal despesaTotal = despesaRepository.somarPorStatusEPeriodo(
                unidades, StatusDespesa.PAGA, inicioAno, fimAno);

        Map<String, BigDecimal> porForma = new HashMap<>();
        for (Agendamento a : agendamentosAno) {
            Pagamento p = a.getPagamento();
            String forma = p != null && p.getTipoPagamento() != null ? p.getTipoPagamento().name() : "OUTRO";
            BigDecimal valor = a.getValorFinal() != null ? a.getValorFinal()
                    : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO);
            porForma.merge(forma, valor, BigDecimal::add);
        }

        Map<String, BigDecimal> receitaPorMesMap = new LinkedHashMap<>();
        Map<String, BigDecimal> despesaPorMesMap = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) {
            String chave = String.format("%04d-%02d", ano, m);
            receitaPorMesMap.put(chave, BigDecimal.ZERO);
            despesaPorMesMap.put(chave, BigDecimal.ZERO);
        }
        for (Agendamento a : agendamentosAno) {
            if (a.getDataHoraInicio() == null) continue;
            String chave = String.format("%04d-%02d", a.getDataHoraInicio().getYear(),
                    a.getDataHoraInicio().getMonthValue());
            BigDecimal valor = a.getValorFinal() != null ? a.getValorFinal()
                    : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO);
            receitaPorMesMap.merge(chave, valor, BigDecimal::add);
        }
        for (int m = 1; m <= 12; m++) {
            LocalDate inicioMes = LocalDate.of(ano, m, 1);
            LocalDate fimMes = inicioMes.withDayOfMonth(inicioMes.lengthOfMonth());
            BigDecimal d = despesaRepository.somarPorStatusEPeriodo(unidades, StatusDespesa.PAGA, inicioMes, fimMes);
            despesaPorMesMap.put(String.format("%04d-%02d", ano, m), d);
        }

        List<FinanceiroDashboardDTO.MesValor> receitaPorMes = receitaPorMesMap.entrySet().stream()
                .map(e -> new FinanceiroDashboardDTO.MesValor(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        List<FinanceiroDashboardDTO.MesValor> despesaPorMes = despesaPorMesMap.entrySet().stream()
                .map(e -> new FinanceiroDashboardDTO.MesValor(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        String melhorMes = null;
        BigDecimal melhorValor = BigDecimal.ZERO;
        String piorMes = null;
        BigDecimal piorValor = null;
        BigDecimal somaMeses = BigDecimal.ZERO;
        int mesesContagem = 0;
        for (FinanceiroDashboardDTO.MesValor mv : receitaPorMes) {
            if (mv.getValor().compareTo(BigDecimal.ZERO) > 0) {
                somaMeses = somaMeses.add(mv.getValor());
                mesesContagem++;
                if (mv.getValor().compareTo(melhorValor) > 0) {
                    melhorValor = mv.getValor();
                    melhorMes = mv.getMes();
                }
                if (piorValor == null || mv.getValor().compareTo(piorValor) < 0) {
                    piorValor = mv.getValor();
                    piorMes = mv.getMes();
                }
            }
        }
        BigDecimal ganhoMedio = mesesContagem > 0
                ? somaMeses.divide(BigDecimal.valueOf(mesesContagem), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return FinanceiroDashboardDTO.builder()
                .ano(ano)
                .receitaTotal(receitaTotal)
                .despesaTotal(despesaTotal)
                .lucroTotal(receitaTotal.subtract(despesaTotal))
                .receitaPorFormaPagamento(porForma)
                .receitaPorMes(receitaPorMes)
                .despesaPorMes(despesaPorMes)
                .melhorMes(melhorMes)
                .melhorMesValor(melhorValor)
                .piorMes(piorMes)
                .piorMesValor(piorValor != null ? piorValor : BigDecimal.ZERO)
                .ganhoMedioMensal(ganhoMedio)
                .build();
    }

    // ============ Fluxo de caixa diário ============

    public List<FluxoCaixaDiarioDTO> fluxoDiario(LocalDate inicio, LocalDate fim, Long unidadeIdFiltro) {
        Set<Long> unidades = unidadesPermitidas();
        if (unidadeIdFiltro != null && unidades.contains(unidadeIdFiltro)) {
            unidades = Set.of(unidadeIdFiltro);
        }

        Map<LocalDate, BigDecimal> entradasPorDia = new LinkedHashMap<>();
        Map<LocalDate, BigDecimal> saidasPorDia = new LinkedHashMap<>();
        for (LocalDate d = inicio; !d.isAfter(fim); d = d.plusDays(1)) {
            entradasPorDia.put(d, BigDecimal.ZERO);
            saidasPorDia.put(d, BigDecimal.ZERO);
        }

        Set<Long> unidadesFinal = unidades;
        List<Agendamento> agendamentos = agendamentoRepository.findByPeriodo(
                        inicio.atStartOfDay(), fim.atTime(23, 59, 59)).stream()
                .filter(a -> a.getUnidade() != null && unidadesFinal.contains(a.getUnidade().getId()))
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .collect(Collectors.toList());
        for (Agendamento a : agendamentos) {
            if (a.getDataHoraInicio() == null) continue;
            LocalDate dia = a.getDataHoraInicio().toLocalDate();
            BigDecimal valor = a.getValorFinal() != null ? a.getValorFinal()
                    : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO);
            entradasPorDia.merge(dia, valor, BigDecimal::add);
        }

        despesaRepository.findByPeriodo(unidadesFinal, inicio, fim).stream()
                .filter(d -> d.getStatus() == StatusDespesa.PAGA && d.getDataPagamento() != null)
                .filter(d -> !d.getDataPagamento().isBefore(inicio) && !d.getDataPagamento().isAfter(fim))
                .forEach(d -> saidasPorDia.merge(d.getDataPagamento(), d.getValor(), BigDecimal::add));

        List<FluxoCaixaDiarioDTO> resultado = new ArrayList<>();
        BigDecimal acumulado = BigDecimal.ZERO;
        for (LocalDate d : entradasPorDia.keySet()) {
            BigDecimal e = entradasPorDia.getOrDefault(d, BigDecimal.ZERO);
            BigDecimal s = saidasPorDia.getOrDefault(d, BigDecimal.ZERO);
            BigDecimal saldo = e.subtract(s);
            acumulado = acumulado.add(saldo);
            resultado.add(FluxoCaixaDiarioDTO.builder()
                    .dia(d).entradas(e).saidas(s)
                    .saldoDia(saldo).saldoAcumulado(acumulado).build());
        }
        return resultado;
    }

    // ============ Helpers ============

    private Set<Long> unidadesPermitidas() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        Usuario u = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        return switch (u.getPerfil()) {
            case ADMIN -> unidadeRepository.findAll().stream().map(Unidade::getId).collect(Collectors.toSet());
            case ADMINISTRADOR -> unidadeRepository.findByAdminUnicoId(u.getId()).stream()
                    .map(Unidade::getId).collect(Collectors.toSet());
            case GERENTE -> {
                Long admin = u.getAdminUnicoId();
                if (admin != null) {
                    yield unidadeRepository.findByAdminUnicoId(admin).stream()
                            .map(Unidade::getId).collect(Collectors.toSet());
                }
                yield u.getUnidades() == null ? Set.of()
                        : u.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            }
            case PROFISSIONAL -> u.getUnidades() == null ? Set.of()
                    : u.getUnidades().stream().map(Unidade::getId).collect(Collectors.toSet());
            default -> Set.of();
        };
    }
}
