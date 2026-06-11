package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * #159: status do NotaFácil pra uma unidade — mostrado no card de provisionamento
 * no frontend. A API key NUNCA volta completa (só `apiKeyMascarada`).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotaFacilStatusDTO {

    private boolean provisionado;

    /** Ex.: "sk_live_***1234" — só os 4 últimos chars expostos. NULL se sem key. */
    private String apiKeyMascarada;

    /** Timestamp do provisionamento (se via service) ou NULL. */
    private LocalDateTime provisionadoEm;

    /** Toggle "Emitir NFS-e automaticamente ao concluir". */
    private boolean notafacilAtivo;

    /** Checklist pro frontend: cada chave true/false. Empty se está tudo OK. */
    private List<PreRequisito> preRequisitos;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PreRequisito {
        private String chave;     // ex.: "cnpj", "inscricaoMunicipal"
        private String rotulo;    // ex.: "CNPJ cadastrado"
        private boolean ok;
        private String detalhe;   // valor ou explicação
    }
}
