package br.com.agendainteligente.controller;

import br.com.agendainteligente.service.IaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ia")
@RequiredArgsConstructor
public class IaController {

    private final IaService iaService;

    @PostMapping("/sugerir-resposta-reclamacao")
    public ResponseEntity<Map<String, String>> sugerirRespostaReclamacao(
            @RequestBody Map<String, String> body) {
        String mensagem = body.getOrDefault("mensagem", "");
        if (mensagem.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String resposta = iaService.sugerirRespostaReclamacao(mensagem);
        return ResponseEntity.ok(Map.of("resposta", resposta));
    }

    @PostMapping("/sugerir-servico")
    public ResponseEntity<Map<String, String>> sugerirServico(
            @RequestBody Map<String, Object> body) {
        String areaAtuacao = (String) body.getOrDefault("areaAtuacao", "serviços gerais");
        String nomeBase = (String) body.getOrDefault("nomeBase", "");
        int duracaoMinutos = body.containsKey("duracaoMinutos")
                ? ((Number) body.get("duracaoMinutos")).intValue() : 60;
        double valor = body.containsKey("valor")
                ? ((Number) body.get("valor")).doubleValue() : 0.0;

        if (nomeBase.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        Map<String, String> sugestao = iaService.sugerirServico(areaAtuacao, nomeBase, duracaoMinutos, valor);
        return ResponseEntity.ok(sugestao);
    }

    @PostMapping("/mensagem-reengajamento")
    public ResponseEntity<Map<String, String>> mensagemReengajamento(
            @RequestBody Map<String, Object> body) {
        String nomeCliente = (String) body.getOrDefault("nomeCliente", "Cliente");
        String nomeNegocio = (String) body.getOrDefault("nomeNegocio", "nosso negócio");
        int diasAusente = body.containsKey("diasAusente")
                ? ((Number) body.get("diasAusente")).intValue() : 30;
        String ultimoServico = (String) body.getOrDefault("ultimoServico", "serviço");

        String mensagem = iaService.gerarMensagemReengajamento(nomeCliente, nomeNegocio, diasAusente, ultimoServico);
        return ResponseEntity.ok(Map.of("mensagem", mensagem));
    }
}
