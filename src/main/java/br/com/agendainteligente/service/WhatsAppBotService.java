package br.com.agendainteligente.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Chatbot WhatsApp via Evolution API + Google Gemini Flash (free tier).
 *
 * Configuração necessária:
 *  EVOLUTION_API_URL      - URL da instância Evolution API (ex: https://evolution.suaempresa.com)
 *  EVOLUTION_API_KEY      - API Key da Evolution API
 *  EVOLUTION_INSTANCE     - Nome da instância WhatsApp
 *  GEMINI_API_KEY         - Google Gemini API Key (gratuita em aistudio.google.com)
 *  CHATBOT_HABILITADO     - true/false (default false)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatsAppBotService {

    @Value("${chatbot.evolution.api-url:}")
    private String evolutionApiUrl;

    @Value("${chatbot.evolution.api-key:}")
    private String evolutionApiKey;

    @Value("${chatbot.evolution.instance:agendainteligente}")
    private String evolutionInstance;

    @Value("${chatbot.gemini.api-key:}")
    private String geminiApiKey;

    @Value("${chatbot.habilitado:false}")
    private boolean habilitado;

    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    private final WebClient webClient = WebClient.builder().build();

    private static final String SYSTEM_PROMPT = """
            Você é o assistente virtual da agenda. Ajude clientes a:
            - Consultar horários disponíveis
            - Fazer agendamentos (colete: nome, serviço desejado, data preferida)
            - Cancelar ou remarcar agendamentos
            - Tirar dúvidas sobre serviços e preços

            Seja simpático, use linguagem informal. Responda sempre em português.
            Se o cliente quiser agendar, colete nome, serviço e data/hora preferida
            e encerre com: [AGENDAR: nome=X, servico=Y, data=Z]
            """;

    public void processarMensagem(String telefone, String mensagem) {
        if (!habilitado) {
            log.debug("WhatsApp bot desabilitado — mensagem de {} ignorada", telefone);
            return;
        }

        try {
            String resposta = chamarGemini(mensagem);
            if (resposta != null && !resposta.isBlank()) {
                enviarMensagem(telefone, resposta);
            }
        } catch (Exception e) {
            log.error("Erro ao processar mensagem WhatsApp de {}: {}", telefone, e.getMessage());
        }
    }

    private String chamarGemini(String mensagemUsuario) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) return null;

        var body = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(
                                Map.of("text", SYSTEM_PROMPT + "\n\nCliente: " + mensagemUsuario)
                        ))
                )
        );

        try {
            @SuppressWarnings("unchecked")
            var resp = (Map<String, Object>) webClient.post()
                    .uri(GEMINI_URL + "?key=" + geminiApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (resp == null) return null;

            @SuppressWarnings("unchecked")
            var candidates = (List<Map<String, Object>>) resp.get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;

            @SuppressWarnings("unchecked")
            var content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            var parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty()) return null;

            return (String) parts.get(0).get("text");
        } catch (Exception e) {
            log.error("Erro Gemini: {}", e.getMessage());
            return null;
        }
    }

    private void enviarMensagem(String telefone, String texto) {
        if (evolutionApiUrl == null || evolutionApiUrl.isBlank()) return;

        var body = Map.of(
                "number", telefone,
                "text", texto
        );

        try {
            webClient.post()
                    .uri(evolutionApiUrl + "/message/sendText/" + evolutionInstance)
                    .header("apikey", evolutionApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
        } catch (Exception e) {
            log.error("Erro ao enviar mensagem WhatsApp para {}: {}", telefone, e.getMessage());
        }
    }
}
