package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class LembreteAgendadoService {

    private final AgendamentoRepository agendamentoRepository;
    private final EmailService emailService;

    @Value("${app.url-base:http://localhost:5173}")
    private String urlBase;

    private static final DateTimeFormatter FMT_PT =
            DateTimeFormatter.ofPattern("dd/MM/yyyy 'às' HH:mm", new Locale("pt", "BR"));

    // ── Roda a cada hora: envia lembrete 24h antes ────────────────────────────

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void enviarLembretes24h() {
        LocalDateTime inicio = LocalDateTime.now().plusHours(23);
        LocalDateTime fim = LocalDateTime.now().plusHours(25);

        List<Agendamento> pendentes = agendamentoRepository.findAgendamentosParaLembrete24h(inicio, fim);
        for (Agendamento ag : pendentes) {
            enviarLembrete24h(ag);
            ag.setLembrete24hEnviado(true);
            agendamentoRepository.save(ag);
        }

        if (!pendentes.isEmpty()) {
            log.info("Lembretes 24h enviados: {}", pendentes.size());
        }
    }

    // ── Chamado ao criar agendamento ──────────────────────────────────────────

    @Transactional
    public void enviarConfirmacao(Agendamento ag) {
        if (ag.getLembreteConfirmacaoEnviado() != null && ag.getLembreteConfirmacaoEnviado()) return;

        String email = emailCliente(ag);
        if (email == null) return;

        String nome = ag.getCliente() != null ? ag.getCliente().getNome() : "Cliente";
        String dataHora = ag.getDataHoraInicio().format(FMT_PT);
        String servico = ag.getServicos() != null && !ag.getServicos().isEmpty()
                ? ag.getServicos().get(0).getServico().getNome() : "serviço";
        String unidade = ag.getUnidade() != null ? ag.getUnidade().getNome() : "";

        String html = buildEmailHtml(
                "Agendamento confirmado! ✅",
                nome,
                """
                Seu agendamento foi confirmado com sucesso.<br><br>
                <b>Serviço:</b> %s<br>
                <b>Data e hora:</b> %s<br>
                <b>Local:</b> %s<br><br>
                Até lá!
                """.formatted(servico, dataHora, unidade)
        );

        emailService.enviar(email, "Agendamento confirmado — " + servico, html);
        ag.setLembreteConfirmacaoEnviado(true);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void enviarLembrete24h(Agendamento ag) {
        String email = emailCliente(ag);
        if (email == null) return;

        String nome = ag.getCliente() != null ? ag.getCliente().getNome() : "Cliente";
        String dataHora = ag.getDataHoraInicio().format(FMT_PT);
        String servico = ag.getServicos() != null && !ag.getServicos().isEmpty()
                ? ag.getServicos().get(0).getServico().getNome() : "serviço";
        String unidade = ag.getUnidade() != null ? ag.getUnidade().getNome() : "";

        String html = buildEmailHtml(
                "Lembrete: seu agendamento é amanhã 🗓️",
                nome,
                """
                Só lembrando que você tem um agendamento amanhã!<br><br>
                <b>Serviço:</b> %s<br>
                <b>Data e hora:</b> %s<br>
                <b>Local:</b> %s<br><br>
                Caso precise reagendar, entre em contato conosco com antecedência.
                """.formatted(servico, dataHora, unidade)
        );

        emailService.enviar(email, "Lembrete do seu agendamento — " + servico, html);
    }

    private String emailCliente(Agendamento ag) {
        if (ag.getCliente() == null) return null;
        String email = ag.getCliente().getEmail();
        return (email != null && !email.isBlank()) ? email : null;
    }

    private String buildEmailHtml(String titulo, String nomeCliente, String corpo) {
        return """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:sans-serif;background:#f8f9fa;margin:0;padding:20px">
                  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
                    <div style="background:#7c3aed;padding:28px 32px">
                      <h1 style="color:#fff;font-size:20px;margin:0">%s</h1>
                    </div>
                    <div style="padding:28px 32px;color:#374151;line-height:1.6">
                      <p>Olá, <b>%s</b>!</p>
                      <p>%s</p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
                      <p style="font-size:12px;color:#9ca3af">
                        AgendaInteligente · Enviado automaticamente, não responda este email.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(titulo, nomeCliente, corpo);
    }
}
