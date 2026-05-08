package br.com.agendainteligente.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.email.remetente:noreply@agendainteligente.com.br}")
    private String remetente;

    @Value("${app.email.habilitado:false}")
    private boolean habilitado;

    @Async
    public void enviar(String destinatario, String assunto, String htmlBody) {
        if (!habilitado) {
            log.debug("Email desabilitado — não enviado para {}: {}", destinatario, assunto);
            return;
        }
        if (destinatario == null || destinatario.isBlank()) return;

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(destinatario);
            helper.setSubject(assunto);
            helper.setText(htmlBody, true);
            mailSender.send(msg);
            log.info("Email enviado para {}: {}", destinatario, assunto);
        } catch (Exception e) {
            log.error("Falha ao enviar email para {}: {}", destinatario, e.getMessage());
        }
    }
}
