package br.com.agendainteligente.integration.notafacil;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.integration.NfseIntegration;
import br.com.agendainteligente.integration.NfseManausIntegration.ResultadoNfse;
import br.com.agendainteligente.integration.notafacil.NotaFacilClient.ConsultaResponse;
import br.com.agendainteligente.integration.notafacil.NotaFacilClient.EmissaoRequest;
import br.com.agendainteligente.integration.notafacil.NotaFacilClient.EmissaoRequest.Servico;
import br.com.agendainteligente.integration.notafacil.NotaFacilClient.EmissaoRequest.Tomador;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors;

/**
 * Integração com NFS-e via NotaFácil (Nota MEI Gateway — ScantelburyDevs).
 *
 * Fluxo:
 * 1. Monta EmissaoRequest com dados do agendamento, cliente e serviços.
 * 2. Chama POST /v1/nfse usando a API key da unidade.
 * 3. Retorna nota_id; o status definitivo chega via webhook (POST /api/webhooks/notafacil).
 * 4. Enquanto isso, salva nota com status PROCESSANDO — webhook atualiza para EMITIDA/REJEITADA.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class NfseNotaFacilIntegration implements NfseIntegration {

    private final NotaFacilClient notaFacilClient;

    @Value("${notafacil.webhook-base-url:https://agenda-backend-production-cc5e.up.railway.app}")
    private String webhookBaseUrl;

    // Código NBS padrão para "Outros serviços" — unidade pode sobrescrever futuramente
    private static final String CODIGO_NBS_PADRAO = "01.01.01.10";
    private static final double ALIQUOTA_ISS_PADRAO = 2.0;

    @Override
    public ResultadoNfse emitirNotaFiscal(Agendamento agendamento, BigDecimal valor) {
        Unidade unidade = agendamento.getUnidade();
        Cliente cliente = agendamento.getCliente();

        if (unidade.getNotafacilApiKey() == null || unidade.getNotafacilApiKey().isBlank()) {
            throw new NotaFacilException("Unidade '" + unidade.getNome() + "' não tem API key NotaFácil configurada", null);
        }

        String discriminacao = montarDiscriminacao(agendamento);
        String competencia = agendamento.getDataHoraInicio().format(DateTimeFormatter.ofPattern("yyyy-MM"));
        String webhookUrl = webhookBaseUrl + "/api/webhooks/notafacil";

        EmissaoRequest request = EmissaoRequest.builder()
                .servico(Servico.builder()
                        .codigoNbs(CODIGO_NBS_PADRAO)
                        .discriminacao(discriminacao)
                        .valor(valor)
                        .aliquotaIss(ALIQUOTA_ISS_PADRAO)
                        .build())
                .tomador(montarTomador(cliente, unidade))
                .competencia(competencia)
                .webhookUrl(webhookUrl)
                .build();

        var response = notaFacilClient.emitirNfse(unidade.getNotafacilApiKey(), request);

        log.info("NFS-e enviada para NotaFácil — nota_id: {}, status: {}", response.getNotaId(), response.getStatus());

        // Retorna com nota_id no campo numeroNfse provisoriamente;
        // o webhook substituirá pelo número definitivo quando a nota for autorizada.
        return ResultadoNfse.builder()
                .numeroNfse(response.getNotaId())   // substituído pelo webhook
                .codigoVerificacao(null)             // disponível após autorização
                .urlNfse(null)                       // disponível após autorização
                .xmlNfse(null)                       // disponível após autorização
                .protocolo(response.getNotaId())
                .build();
    }

    private String montarDiscriminacao(Agendamento agendamento) {
        if (agendamento.getServicos() == null || agendamento.getServicos().isEmpty()) {
            return "Serviços prestados conforme agendamento #" + agendamento.getId();
        }
        return agendamento.getServicos().stream()
                .map(s -> s.getDescricao() != null ? s.getDescricao() : s.getServico().getNome())
                .collect(Collectors.joining(", "));
    }

    private Tomador montarTomador(Cliente cliente, Unidade unidade) {
        String doc = cliente.getCpfCnpj() != null ? cliente.getCpfCnpj().replaceAll("\\D", "") : null;
        String tipo = doc != null && doc.length() == 14 ? "PJ" : "PF";
        String municipioIbge = unidade.getMunicipioIbge() != null
                ? unidade.getMunicipioIbge()
                : "3550308"; // São Paulo como fallback

        return Tomador.builder()
                .tipo(tipo)
                .documento(doc)
                .razaoSocial(cliente.getNome())
                .email(cliente.getEmail())
                .municipioIbge(municipioIbge)
                .build();
    }
}
