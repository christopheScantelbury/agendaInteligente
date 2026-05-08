package br.com.agendainteligente.controller;

import br.com.agendainteligente.service.WhatsAppBotService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Webhook receptor do Evolution API.
 * Configure no Evolution API: POST /api/whatsapp/webhook
 */
@RestController
@RequestMapping("/api/whatsapp")
@RequiredArgsConstructor
@Slf4j
public class WhatsAppWebhookController {

    private final WhatsAppBotService whatsAppBotService;

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> payload) {
        try {
            String event = (String) payload.get("event");
            if (!"messages.upsert".equals(event)) return ResponseEntity.ok().build();

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) payload.get("data");
            if (data == null) return ResponseEntity.ok().build();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> messages = (List<Map<String, Object>>) data.get("messages");
            if (messages == null || messages.isEmpty()) return ResponseEntity.ok().build();

            Map<String, Object> message = messages.get(0);
            Boolean fromMe = (Boolean) message.get("key.fromMe");
            if (Boolean.TRUE.equals(fromMe)) return ResponseEntity.ok().build();

            @SuppressWarnings("unchecked")
            Map<String, Object> key = (Map<String, Object>) message.get("key");
            String remoteJid = key != null ? (String) key.get("remoteJid") : null;
            if (remoteJid == null) return ResponseEntity.ok().build();

            @SuppressWarnings("unchecked")
            Map<String, Object> msgContent = (Map<String, Object>) message.get("message");
            if (msgContent == null) return ResponseEntity.ok().build();

            String texto = (String) msgContent.get("conversation");
            if (texto == null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> extended = (Map<String, Object>) msgContent.get("extendedTextMessage");
                if (extended != null) texto = (String) extended.get("text");
            }

            if (texto != null && !texto.isBlank()) {
                whatsAppBotService.processarMensagem(remoteJid, texto);
            }
        } catch (Exception e) {
            log.error("Erro ao processar webhook WhatsApp: {}", e.getMessage());
        }

        return ResponseEntity.ok().build();
    }
}
