package br.com.agendainteligente.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class IaService {

    @Value("${groq.api-key:}")
    private String groqApiKey;

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.3-70b-versatile";

    private final RestClient restClient = RestClient.builder().build();

    public String sugerirRespostaReclamacao(String mensagem) {
        String prompt = """
                Você é um assistente de atendimento ao cliente para um sistema de agendamento (salões, clínicas, academias).
                Um cliente enviou a seguinte reclamação:

                "%s"

                Escreva uma resposta profissional, empática e concisa em português brasileiro.
                A resposta deve: reconhecer o problema, pedir desculpas se necessário, propor uma solução prática.
                Máximo de 3 parágrafos curtos. Não use saudações formais longas. Vá direto ao ponto.
                Retorne APENAS o texto da resposta, sem introduções ou explicações.
                """.formatted(mensagem);

        return chamarGroq(prompt);
    }

    public Map<String, String> sugerirServico(String areaAtuacao, String nomeBase, int duracaoMinutos, double valor) {
        String prompt = """
                Você é um especialista em marketing para negócios de serviços no Brasil (%s).
                Crie um nome atrativo e uma descrição de marketing para o seguinte serviço:
                - Nome base: %s
                - Duração: %d minutos
                - Valor: R$ %.2f

                Retorne EXATAMENTE neste formato JSON (sem markdown, sem explicações extras):
                {"nome": "nome atrativo aqui", "descricao": "descrição de marketing aqui com até 2 frases"}
                """.formatted(areaAtuacao, nomeBase, duracaoMinutos, valor);

        String resposta = chamarGroq(prompt);
        return extrairJsonServico(resposta);
    }

    public String gerarMensagemReengajamento(String nomeCliente, String nomeNegocio, int diasAusente, String ultimoServico) {
        String prompt = """
                Escreva uma mensagem de WhatsApp curta e amigável para reconquistar um cliente.
                - Cliente: %s
                - Negócio: %s
                - Dias sem visita: %d
                - Último serviço: %s

                A mensagem deve ser informal, calorosa, curta (máximo 3 linhas) e incluir um CTA para agendar.
                NÃO use emoji excessivo. Retorne APENAS o texto da mensagem.
                """.formatted(nomeCliente, nomeNegocio, diasAusente, ultimoServico);

        return chamarGroq(prompt);
    }

    public String gerarInsightSemanal(String dados) {
        String prompt = """
                Você é um consultor de negócios para pequenas empresas de serviços no Brasil.
                Analise os dados da semana e escreva um insight curto e útil em português:

                %s

                Escreva 2-3 frases diretas com a principal observação e uma sugestão prática.
                Seja específico com os números. Retorne APENAS o texto do insight.
                """.formatted(dados);

        return chamarGroq(prompt);
    }

    private String chamarGroq(String prompt) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            log.warn("GROQ_API_KEY não configurada — retornando resposta padrão");
            return "";
        }

        try {
            var body = Map.of(
                "model", MODEL,
                "messages", List.of(Map.of("role", "user", "content", prompt)),
                "temperature", 0.7,
                "max_tokens", 512
            );

            var resposta = restClient.post()
                .uri(GROQ_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(new ParameterizedTypeReference<Map<String, Object>>() {});

            if (resposta == null) return "";

            var choices = (List<Map<String, Object>>) resposta.get("choices");
            if (choices == null || choices.isEmpty()) return "";

            var message = (Map<String, String>) choices.get(0).get("message");
            return message != null ? message.getOrDefault("content", "").strip() : "";

        } catch (Exception e) {
            log.error("Erro ao chamar Groq API: {}", e.getMessage());
            return "";
        }
    }

    private Map<String, String> extrairJsonServico(String resposta) {
        try {
            int start = resposta.indexOf('{');
            int end = resposta.lastIndexOf('}');
            if (start == -1 || end == -1) return Map.of("nome", "", "descricao", "");
            String json = resposta.substring(start, end + 1);
            // Parse manual simples para evitar dependência de Jackson extra
            String nome = extrairCampoJson(json, "nome");
            String descricao = extrairCampoJson(json, "descricao");
            return Map.of("nome", nome, "descricao", descricao);
        } catch (Exception e) {
            return Map.of("nome", "", "descricao", "");
        }
    }

    private String extrairCampoJson(String json, String campo) {
        String key = "\"" + campo + "\"";
        int idx = json.indexOf(key);
        if (idx == -1) return "";
        int colon = json.indexOf(':', idx);
        int quote1 = json.indexOf('"', colon + 1);
        int quote2 = json.indexOf('"', quote1 + 1);
        if (quote1 == -1 || quote2 == -1) return "";
        return json.substring(quote1 + 1, quote2);
    }
}
