package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.PushToken;
import br.com.agendainteligente.repository.PushTokenRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

/**
 * Envia push notifications via Expo Push API.
 *
 * Pré-requisitos operacionais (NÃO bloqueiam build/deploy mas SÃO bloqueiam
 * entrega real de push pro device):
 * 1. Expo project ID configurado no mobile/app.json (expo.extra.eas.projectId)
 * 2. Credenciais FCM (Android) configuradas no Expo dashboard do projeto
 * 3. Credenciais APNs (iOS) configuradas no Expo dashboard do projeto
 * 4. Build EAS feito após config (não funciona em Expo Go padrão)
 *
 * Sem isso, este service ainda funciona — POST pra Expo API retorna sucesso,
 * mas Expo não entrega ao device. Logs vão mostrar a resposta da Expo API
 * pra debug.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
    private final PushTokenRepository pushTokenRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${app.push.enabled:true}")
    private boolean pushEnabled;

    @Async
    public void enviarParaCliente(Long clienteId, String titulo, String corpo, Map<String, Object> data) {
        if (!pushEnabled) {
            log.debug("[PUSH] desabilitado por config — pular envio");
            return;
        }
        List<PushToken> tokens = pushTokenRepository.findByClienteIdAndAtivoTrue(clienteId);
        if (tokens.isEmpty()) {
            log.debug("[PUSH] cliente {} não tem tokens ativos", clienteId);
            return;
        }
        for (PushToken pt : tokens) {
            enviarToken(pt.getToken(), titulo, corpo, data);
        }
    }

    private void enviarToken(String token, String titulo, String corpo, Map<String, Object> data) {
        try {
            Map<String, Object> payload = Map.of(
                    "to", token,
                    "title", titulo,
                    "body", corpo,
                    "sound", "default",
                    "data", data != null ? data : Map.of()
            );
            String body = objectMapper.writeValueAsString(payload);
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(EXPO_PUSH_URL))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 200 && resp.statusCode() < 300) {
                log.info("[PUSH] enviado para {} (resp: {})", token.substring(0, Math.min(20, token.length())), resp.body());
            } else {
                log.warn("[PUSH] falhou para {} — status {}: {}", token, resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.error("[PUSH] erro ao enviar para {}: {}", token, e.getMessage());
        }
    }
}
