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

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void enviarLembretes24h() {
        LocalDateTime inicio = LocalDateTime.now().plusHours(23);
        LocalDateTime fim = LocalDateTime.now().plusHours(25);

        List<Agendamento> pendentes = agendamentoRepository.findAgendamentosParaLembrete24h(inicio, fim);
        for (Agendamento ag : pendentes) {
            ag.setLembrete24hEnviado(true);
            agendamentoRepository.save(ag);
        }

        if (!pendentes.isEmpty()) {
            log.info("Lembretes 24h marcados (sem envio): {}", pendentes.size());
        }
    }

    @Transactional
    public void enviarConfirmacao(Agendamento ag) {
        if (ag.getLembreteConfirmacaoEnviado() != null && ag.getLembreteConfirmacaoEnviado()) return;
        ag.setLembreteConfirmacaoEnviado(true);
    }
}
