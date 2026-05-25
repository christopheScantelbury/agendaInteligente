package br.com.agendainteligente.controller;

import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.NotaFiscalRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Endpoints exclusivos do ADMIN global — visão de plataforma.
 * Não expõe dados operacionais de tenants específicos.
 */
@RestController
@RequestMapping("/api/plataforma")
@RequiredArgsConstructor
public class PlataformaController {

    private final EmpresaRepository empresaRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final NotaFiscalRepository notaFiscalRepository;
    private final UsuarioRepository usuarioRepository;

    /**
     * Métricas agregadas da plataforma. Apenas counts; sem PII.
     */
    @GetMapping("/metricas")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> metricasPlataforma() {
        LocalDateTime inicioDoMes = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        long empresasAtivas = empresaRepository.findByAtivoTrue().size();
        long totalEmpresas = empresaRepository.count();
        long usuariosAtivos = usuarioRepository.findAll().stream().filter(u -> Boolean.TRUE.equals(u.getAtivo())).count();
        long totalAgendamentos = agendamentoRepository.count();
        long agendamentosMes = agendamentoRepository.findAll().stream()
                .filter(a -> a.getDataHoraInicio() != null && !a.getDataHoraInicio().isBefore(inicioDoMes))
                .count();
        long totalNfse = notaFiscalRepository.count();
        long nfseMes = notaFiscalRepository.findAll().stream()
                .filter(n -> n.getDataCriacao() != null && !n.getDataCriacao().isBefore(inicioDoMes))
                .count();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("empresasAtivas", empresasAtivas);
        response.put("totalEmpresas", totalEmpresas);
        response.put("usuariosAtivos", usuariosAtivos);
        response.put("totalAgendamentos", totalAgendamentos);
        response.put("agendamentosMes", agendamentosMes);
        response.put("totalNfse", totalNfse);
        response.put("nfseMes", nfseMes);
        // Placeholders — dependem de integração Stripe (escopo futuro)
        response.put("mrr", null);
        response.put("churn", null);
        return ResponseEntity.ok(response);
    }
}
