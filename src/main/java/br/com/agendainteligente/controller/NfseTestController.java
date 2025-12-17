package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.integration.NfseManausIntegration;
import br.com.agendainteligente.repository.AgendamentoRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller para testes de emissão de NFS-e
 * Apenas para ambiente de desenvolvimento/homologação
 */
@RestController
@RequestMapping("/api/nfse/test")
@RequiredArgsConstructor
@Tag(name = "Teste NFS-e", description = "Endpoints para testar emissão de NFS-e em homologação")
@Slf4j
public class NfseTestController {

    private final NfseManausIntegration nfseManausIntegration;
    private final AgendamentoRepository agendamentoRepository;

    @PostMapping("/agendamento/{agendamentoId}")
    @Operation(summary = "Testar emissão de NFS-e para um agendamento")
    public ResponseEntity<Map<String, Object>> testarEmissao(@PathVariable Long agendamentoId) {
        log.info("=== TESTE DE EMISSÃO NFS-e ===");
        log.info("Agendamento ID: {}", agendamentoId);

        Agendamento agendamento = agendamentoRepository.findById(agendamentoId)
                .orElseThrow(() -> new RuntimeException("Agendamento não encontrado"));

        // Força carregamento dos relacionamentos
        if (agendamento.getServicos() != null) {
            agendamento.getServicos().size();
        }
        if (agendamento.getUnidade() != null && agendamento.getUnidade().getClinica() != null) {
            agendamento.getUnidade().getClinica().getNome();
        }

        BigDecimal valor = agendamento.getValorFinal() != null 
                ? agendamento.getValorFinal() 
                : agendamento.getValorTotal();

        log.info("Valor para NFS-e: {}", valor);
        log.info("Clínica: {}", agendamento.getUnidade().getClinica().getNome());
        log.info("CNPJ: {}", agendamento.getUnidade().getClinica().getCnpj());
        log.info("Inscrição Municipal: {}", agendamento.getUnidade().getClinica().getInscricaoMunicipal());
        log.info("Cliente: {}", agendamento.getCliente().getNome());
        log.info("CPF/CNPJ Cliente: {}", agendamento.getCliente().getCpfCnpj());

        try {
            var resultado = nfseManausIntegration.emitirNotaFiscal(agendamento, valor);

            Map<String, Object> response = new HashMap<>();
            response.put("sucesso", true);
            response.put("numeroNfse", resultado.getNumeroNfse());
            response.put("codigoVerificacao", resultado.getCodigoVerificacao());
            response.put("urlNfse", resultado.getUrlNfse());
            response.put("protocolo", resultado.getProtocolo());
            response.put("mensagem", "NFS-e emitida com sucesso (ambiente de homologação)");

            log.info("=== TESTE CONCLUÍDO COM SUCESSO ===");
            log.info("Número NFS-e: {}", resultado.getNumeroNfse());
            log.info("Protocolo: {}", resultado.getProtocolo());
            log.info("URL: {}", resultado.getUrlNfse());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("=== ERRO NO TESTE DE EMISSÃO ===", e);

            Map<String, Object> response = new HashMap<>();
            response.put("sucesso", false);
            response.put("erro", e.getMessage());
            response.put("tipoErro", e.getClass().getSimpleName());
            if (e.getCause() != null) {
                response.put("causa", e.getCause().getMessage());
            }

            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/info")
    @Operation(summary = "Informações sobre o ambiente de teste")
    public ResponseEntity<Map<String, Object>> infoAmbiente() {
        Map<String, Object> info = new HashMap<>();
        info.put("ambiente", "homologacao");
        info.put("tipo", "NFS-e (Nota Fiscal de Serviços Eletrônica)");
        info.put("padrao", "ABRASF");
        info.put("documentacao", "DOC_102 - Prefeitura de Manaus");
        info.put("portal", "https://nfsev-prd.manaus.am.gov.br/nfsev/servlet/hlogin");
        info.put("observacao", "Este é um ambiente de testes. Use o CNPJ da sua software house.");
        return ResponseEntity.ok(info);
    }
}

