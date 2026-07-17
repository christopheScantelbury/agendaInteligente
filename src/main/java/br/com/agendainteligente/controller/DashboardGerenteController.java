package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.PerfilRepository;
import br.com.agendainteligente.repository.ServicoRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.repository.ConviteAcessoRepository;
import br.com.agendainteligente.security.SecurityHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.web.bind.annotation.RequestParam;

/**
 * Endpoints do Dashboard do Gerente / Administrador.
 * Filtra dados pelo escopo do usuário logado (admin_unico_id ou unidade vinculada).
 */
@RestController
@RequestMapping("/api/dashboard/gerente")
@RequiredArgsConstructor
public class DashboardGerenteController {

    private static final Set<String> STATUS_CONCLUIDO = Set.of("CONCLUIDO", "FINALIZADO", "PROCEDIMENTO_FIM");
    private static final Set<String> STATUS_PERDA = Set.of("CANCELADO", "NO_SHOW");

    private final AgendamentoRepository agendamentoRepository;
    private final UnidadeRepository unidadeRepository;
    private final AtendenteRepository atendenteRepository;
    private final ServicoRepository servicoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConviteAcessoRepository conviteAcessoRepository;
    private final EmpresaRepository empresaRepository;
    private final PerfilRepository perfilRepository;
    private final SecurityHelper securityHelper;

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    public ResponseEntity<Map<String, Object>> kpis() {
        List<Long> unidadeIds = unidadeIdsDoUsuario(securityHelper.usuarioAtual());

        YearMonth atual = YearMonth.now();
        YearMonth anterior = atual.minusMonths(1);
        LocalDateTime inicioAtual = atual.atDay(1).atStartOfDay();
        LocalDateTime fimAtual = atual.atEndOfMonth().atTime(23, 59, 59);
        LocalDateTime inicioAnterior = anterior.atDay(1).atStartOfDay();
        LocalDateTime fimAnterior = anterior.atEndOfMonth().atTime(23, 59, 59);

        List<Agendamento> doEscopo = unidadeIds.isEmpty()
                ? List.of()
                : agendamentoRepository.findByUnidadeIdIn(unidadeIds);

        BigDecimal faturamentoAtual = somaFaturamentoConcluido(doEscopo, inicioAtual, fimAtual);
        BigDecimal faturamentoAnterior = somaFaturamentoConcluido(doEscopo, inicioAnterior, fimAnterior);
        Double variacao = variacaoPercentual(faturamentoAnterior, faturamentoAtual);

        long totalConcluidos = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                .count();

        BigDecimal ticketMedio = totalConcluidos > 0
                ? faturamentoAtual.divide(BigDecimal.valueOf(totalConcluidos), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long totalDoMes = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .count();
        long perdidos = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> STATUS_PERDA.contains(stringStatus(a)))
                .count();
        double taxaCancelamento = totalDoMes > 0 ? (perdidos * 100.0 / totalDoMes) : 0.0;

        // Ocupação: agendamentos no mês ÷ (profissionais ativos × dias × slots por dia estimado)
        long profissionais = atendenteRepository.findByUnidadeIdIn(unidadeIds).stream()
                .filter(at -> Boolean.TRUE.equals(at.getAtivo()))
                .count();
        LocalDate hoje = LocalDate.now();
        int diasDoMes = atual.lengthOfMonth();
        int diasDecorridos = atual.equals(YearMonth.from(hoje)) ? hoje.getDayOfMonth() : diasDoMes;
        long slotsEstimados = profissionais * Math.max(diasDecorridos, 1) * 8L; // 8 slots/dia estimado
        long agendados = doEscopo.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioAtual)
                        && !a.getDataHoraInicio().isAfter(fimAtual))
                .filter(a -> !STATUS_PERDA.contains(stringStatus(a)))
                .count();
        double ocupacao = slotsEstimados > 0 ? (agendados * 100.0 / slotsEstimados) : 0.0;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("faturamentoMes", faturamentoAtual);
        response.put("faturamentoMesAnterior", faturamentoAnterior);
        response.put("variacaoPercentual", variacao);
        response.put("ticketMedio", ticketMedio);
        response.put("totalAtendimentos", totalDoMes);
        response.put("atendimentosConcluidos", totalConcluidos);
        response.put("taxaCancelamento", arredondar(taxaCancelamento, 1));
        response.put("ocupacaoMedia", arredondar(Math.min(ocupacao, 100), 1));
        response.put("profissionaisAtivos", profissionais);
        return ResponseEntity.ok(response);
    }

    /**
     * Série diária de faturamento — período atual + período anterior comparável.
     * Aceita: dias=7|30|90|365 (default 30).
     */
    @GetMapping("/faturamento-diario")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    public ResponseEntity<Map<String, Object>> faturamentoDiario(
            @RequestParam(defaultValue = "30") int dias
    ) {
        int diasValido = Math.max(1, Math.min(dias, 365));
        List<Long> unidadeIds = unidadeIdsDoUsuario(securityHelper.usuarioAtual());

        LocalDate hoje = LocalDate.now();
        LocalDate inicioAtual = hoje.minusDays(diasValido - 1L);
        LocalDate inicioAnterior = inicioAtual.minusDays(diasValido);
        LocalDateTime corteInicio = inicioAnterior.atStartOfDay();
        LocalDateTime corteFim = hoje.atTime(23, 59, 59);

        List<Agendamento> doEscopo = (unidadeIds.isEmpty()
                ? List.<Agendamento>of()
                : agendamentoRepository.findByUnidadeIdIn(unidadeIds)).stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(corteInicio)
                        && !a.getDataHoraInicio().isAfter(corteFim))
                .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                .toList();

        // Agrupa por data (formato ISO)
        Map<LocalDate, BigDecimal> porDia = new HashMap<>();
        for (Agendamento a : doEscopo) {
            LocalDate d = a.getDataHoraInicio().toLocalDate();
            BigDecimal v = a.getValorFinal() != null ? a.getValorFinal()
                    : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO);
            porDia.merge(d, v, BigDecimal::add);
        }

        List<Map<String, Object>> atualSerie = new ArrayList<>();
        List<Map<String, Object>> anteriorSerie = new ArrayList<>();
        for (int i = 0; i < diasValido; i++) {
            LocalDate dAtual = inicioAtual.plusDays(i);
            LocalDate dAnterior = inicioAnterior.plusDays(i);
            BigDecimal valAtual = porDia.getOrDefault(dAtual, BigDecimal.ZERO);
            BigDecimal valAnterior = porDia.getOrDefault(dAnterior, BigDecimal.ZERO);
            Map<String, Object> pAtual = new LinkedHashMap<>();
            pAtual.put("data", dAtual.toString());
            pAtual.put("valor", valAtual);
            atualSerie.add(pAtual);
            Map<String, Object> pAnt = new LinkedHashMap<>();
            pAnt.put("data", dAnterior.toString());
            pAnt.put("valor", valAnterior);
            anteriorSerie.add(pAnt);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("dias", diasValido);
        response.put("inicioAtual", inicioAtual.toString());
        response.put("inicioAnterior", inicioAnterior.toString());
        response.put("atual", atualSerie);
        response.put("anterior", anteriorSerie);
        return ResponseEntity.ok(response);
    }

    /**
     * Checklist de primeiros passos (onboarding camada 3). Detecta automaticamente.
     */
    @GetMapping("/checklist")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    public ResponseEntity<Map<String, Object>> checklist() {
        Usuario usuario = securityHelper.usuarioAtual();
        List<Long> unidadeIds = unidadeIdsDoUsuario(usuario);
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();

        // Carrega unidades uma vez pra reuso (detecções de horários e NFS-e)
        java.util.List<br.com.agendainteligente.domain.entity.Unidade> unidadesEmpresa =
                unidadeIds.isEmpty()
                        ? java.util.List.of()
                        : unidadeRepository.findAllById(unidadeIds);

        boolean temServico = !servicoRepository.findByAdminUnicoId(adminId).isEmpty();
        boolean temProfissional = !atendenteRepository.findByUnidadeIdIn(unidadeIds).isEmpty();
        // Horários de funcionamento setados em pelo menos uma unidade
        boolean temHorarios = unidadesEmpresa.stream()
                .anyMatch(u -> u.getHorarioAbertura() != null && u.getHorarioFechamento() != null);
        // Personalizou link público se a empresa do usuário tem slug_publico setado.
        boolean personalizouPublico = empresaRepository.findByAdminUnicoId(adminId).stream()
                .findFirst()
                .map(e -> e.getSlugPublico() != null && !e.getSlugPublico().isBlank())
                .orElse(false);
        // Configurou NFS-e se alguma unidade tem CNPJ + razão social + regime tributário.
        // Inscrição municipal é OPCIONAL pra MEI (emite via NFS-e Nacional/gov.br) —
        // pra demais regimes, ainda é obrigatória.
        boolean configurouFiscal = unidadesEmpresa.stream()
                .anyMatch(u -> {
                    if (u.getCnpj() == null || u.getCnpj().isBlank()) return false;
                    if (u.getRazaoSocial() == null || u.getRazaoSocial().isBlank()) return false;
                    if (u.getRegimeTributario() == null || u.getRegimeTributario().isBlank()) return false;
                    boolean isMei = "MEI".equals(u.getRegimeTributario());
                    if (!isMei && (u.getInscricaoMunicipal() == null || u.getInscricaoMunicipal().isBlank())) return false;
                    // Certificado A1 obrigatório em todos os regimes
                    if (u.getCertificadoPfxBase64() == null || u.getCertificadoPfxBase64().isBlank()) return false;
                    if (u.getCertificadoValidoAte() == null
                            || u.getCertificadoValidoAte().isBefore(java.time.LocalDate.now())) return false;
                    return true;
                });
        boolean convidouEquipe = !conviteAcessoRepository.findByCriadoPorIdOrderByDataCriacaoDesc(usuario.getId()).isEmpty();
        // #171: cargos são pré-requisito de convidar equipe — sem eles, não há o
        // que escolher no link e a pessoa entrava com perfil errado.
        boolean definiuCargos = !perfilRepository.findByAdminUnicoIdAndAtivoTrueOrderByNomeAsc(adminId).isEmpty();

        List<Map<String, Object>> tarefas = new ArrayList<>();
        tarefas.add(tarefa("servico", "Cadastrar primeiro serviço", "/configuracoes/servicos", temServico));
        tarefas.add(tarefa("profissional", "Cadastrar primeiro profissional", "/configuracoes/profissionais", temProfissional));
        tarefas.add(tarefa("horarios", "Definir horários de funcionamento", "/configuracoes/horarios", temHorarios));
        tarefas.add(tarefa("publico", "Personalizar link público", "/configuracoes/link-publico", personalizouPublico));
        tarefas.add(tarefa("fiscal", "Configurar emissão de NFS-e (opcional)", "/configuracoes/nfse", configurouFiscal));
        tarefas.add(tarefa("cargos", "Definir os cargos da sua equipe", "/perfis", definiuCargos));
        tarefas.add(tarefa("equipe", "Convidar sua equipe", "/configuracoes/equipe", convidouEquipe));

        long concluidas = tarefas.stream().filter(t -> Boolean.TRUE.equals(t.get("concluida"))).count();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("tarefas", tarefas);
        response.put("concluidas", concluidas);
        response.put("total", tarefas.size());
        return ResponseEntity.ok(response);
    }

    private Map<String, Object> tarefa(String id, String titulo, String path, boolean concluida) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("titulo", titulo);
        m.put("path", path);
        m.put("concluida", concluida);
        return m;
    }

    /**
     * Equipe em tempo real: estado de cada profissional ativo da unidade.
     */
    @GetMapping("/equipe")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> equipe() {
        List<Long> unidadeIds = unidadeIdsDoUsuario(securityHelper.usuarioAtual());
        LocalDate hoje = LocalDate.now();
        LocalDateTime inicioHoje = hoje.atStartOfDay();
        LocalDateTime fimHoje = hoje.atTime(23, 59, 59);
        LocalDateTime agora = LocalDateTime.now();

        List<Agendamento> agendamentosHoje = (unidadeIds.isEmpty()
                ? List.<Agendamento>of()
                : agendamentoRepository.findByUnidadeIdIn(unidadeIds)).stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicioHoje)
                        && !a.getDataHoraInicio().isAfter(fimHoje))
                .toList();

        List<Map<String, Object>> equipe = new ArrayList<>();
        atendenteRepository.findByUnidadeIdIn(unidadeIds).stream()
                .filter(at -> Boolean.TRUE.equals(at.getAtivo()))
                .forEach(at -> {
                    List<Agendamento> meus = agendamentosHoje.stream()
                            .filter(a -> a.getAtendente() != null && at.getId().equals(a.getAtendente().getId()))
                            .toList();

                    String status = "LIVRE";
                    Agendamento proximo = null;
                    for (Agendamento a : meus) {
                        String s = stringStatus(a);
                        if ("EM_ANDAMENTO".equals(s)) {
                            status = "EM_ATENDIMENTO";
                            proximo = a;
                            break;
                        }
                    }
                    if ("LIVRE".equals(status)) {
                        proximo = meus.stream()
                                .filter(a -> !STATUS_PERDA.contains(stringStatus(a))
                                        && !STATUS_CONCLUIDO.contains(stringStatus(a))
                                        && a.getDataHoraInicio() != null
                                        && a.getDataHoraInicio().isAfter(agora))
                                .findFirst()
                                .orElse(null);
                        if (proximo != null
                                && java.time.Duration.between(agora, proximo.getDataHoraInicio()).toMinutes() <= 30) {
                            status = "PROXIMO";
                        }
                    }

                    BigDecimal faturamentoDia = meus.stream()
                            .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                            .map(a -> a.getValorFinal() != null ? a.getValorFinal()
                                    : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO))
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("atendenteId", at.getId());
                    item.put("nome", at.getUsuario() != null ? at.getUsuario().getNome() : "—");
                    item.put("status", status);
                    item.put("proximoHorario", proximo != null ? proximo.getDataHoraInicio() : null);
                    item.put("faturamentoDia", faturamentoDia);
                    item.put("atendimentosHoje", meus.size());
                    equipe.add(item);
                });
        return ResponseEntity.ok(equipe);
    }

    /**
     * Próximos 10 agendamentos de toda a unidade (cronológico, ativos).
     */
    @GetMapping("/proximos")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> proximos() {
        List<Long> unidadeIds = unidadeIdsDoUsuario(securityHelper.usuarioAtual());
        LocalDateTime agora = LocalDateTime.now();

        List<Map<String, Object>> proximos = (unidadeIds.isEmpty()
                ? List.<Agendamento>of()
                : agendamentoRepository.findByUnidadeIdIn(unidadeIds)).stream()
                .filter(a -> a.getDataHoraInicio() != null && a.getDataHoraInicio().isAfter(agora))
                .filter(a -> !STATUS_PERDA.contains(stringStatus(a))
                        && !STATUS_CONCLUIDO.contains(stringStatus(a)))
                .sorted((a, b) -> a.getDataHoraInicio().compareTo(b.getDataHoraInicio()))
                .limit(10)
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", a.getId());
                    m.put("dataHoraInicio", a.getDataHoraInicio());
                    m.put("status", a.getStatus() != null ? a.getStatus().name() : null);
                    m.put("clienteNome", a.getCliente() != null ? a.getCliente().getNome() : "Cliente");
                    m.put("atendenteNome", a.getAtendente() != null && a.getAtendente().getUsuario() != null
                            ? a.getAtendente().getUsuario().getNome() : null);
                    m.put("servicos", a.getServicos() != null
                            ? a.getServicos().stream()
                                .map(s -> s.getServico() != null ? s.getServico().getNome() : null)
                                .filter(java.util.Objects::nonNull)
                                .toList()
                            : List.of());
                    return m;
                })
                .toList();
        return ResponseEntity.ok(proximos);
    }

    private List<Long> unidadeIdsDoUsuario(Usuario usuario) {
        if (usuario == null) return List.of();
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        List<Unidade> unidades = unidadeRepository.findByAdminUnicoId(adminId);
        if (unidades.isEmpty() && usuario.getUnidades() != null) {
            return usuario.getUnidades().stream().map(Unidade::getId).toList();
        }
        return unidades.stream().map(Unidade::getId).toList();
    }

    private BigDecimal somaFaturamentoConcluido(List<Agendamento> ags, LocalDateTime inicio, LocalDateTime fim) {
        return ags.stream()
                .filter(a -> a.getDataHoraInicio() != null
                        && !a.getDataHoraInicio().isBefore(inicio)
                        && !a.getDataHoraInicio().isAfter(fim))
                .filter(a -> STATUS_CONCLUIDO.contains(stringStatus(a)))
                .map(a -> a.getValorFinal() != null ? a.getValorFinal()
                        : (a.getValorTotal() != null ? a.getValorTotal() : BigDecimal.ZERO))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Double variacaoPercentual(BigDecimal anterior, BigDecimal atual) {
        if (anterior == null || anterior.compareTo(BigDecimal.ZERO) == 0) return null;
        return atual.subtract(anterior)
                .multiply(BigDecimal.valueOf(100))
                .divide(anterior, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String stringStatus(Agendamento a) {
        return a.getStatus() != null ? a.getStatus().name() : "";
    }

    private double arredondar(double v, int casas) {
        return BigDecimal.valueOf(v).setScale(casas, RoundingMode.HALF_UP).doubleValue();
    }
}
