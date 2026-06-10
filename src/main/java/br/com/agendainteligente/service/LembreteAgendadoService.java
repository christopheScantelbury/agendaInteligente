package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LembreteAgendadoService {

    private final AgendamentoRepository agendamentoRepository;

    /**
     * Roda de hora em hora. Marca como "lembrete enviado" agendamentos que estão
     * entrando na janela de antecedência configurada pela unidade.
     *
     * #157: cada unidade configura `lembrete_confirmacao_horas` (1-168). Pegamos
     * a janela máxima possível (168h) e filtramos por agendamento conforme a
     * antecedência da unidade dele. Tolerância de ±1h pra cobrir entre execuções.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void enviarLembretes() {
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime fimJanela = agora.plusHours(168); // máximo configurável

        List<Agendamento> candidatos =
                agendamentoRepository.findAgendamentosParaLembrete24h(agora, fimJanela);

        int marcados = 0;
        for (Agendamento ag : candidatos) {
            short horas = ag.getUnidade() != null && ag.getUnidade().getLembreteConfirmacaoHoras() != null
                    ? ag.getUnidade().getLembreteConfirmacaoHoras()
                    : 24;
            LocalDateTime alvo = ag.getDataHoraInicio().minusHours(horas);
            // Tolerância de 1h: pega agendamentos cuja janela alvo já passou ou
            // entra na próxima hora. Idempotente — `lembrete24hEnviado=true` evita repetir.
            if (!agora.isBefore(alvo.minusMinutes(30))
                    && agora.isBefore(alvo.plusHours(1))) {
                ag.setLembrete24hEnviado(true);
                agendamentoRepository.save(ag);
                marcados++;
            }
        }
        if (marcados > 0) {
            log.info("Lembretes de confirmação marcados (sem envio): {}", marcados);
        }
    }

    @Transactional
    public void enviarConfirmacao(Agendamento ag) {
        if (ag.getLembreteConfirmacaoEnviado() != null && ag.getLembreteConfirmacaoEnviado()) return;
        ag.setLembreteConfirmacaoEnviado(true);
    }
}
