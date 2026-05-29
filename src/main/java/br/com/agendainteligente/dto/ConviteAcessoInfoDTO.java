package br.com.agendainteligente.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConviteAcessoInfoDTO {
    private String token;
    private Integer maxUnidades;
    private LocalDateTime dataExpiracaoLink;
    private LocalDate dataExpiracaoAcesso;
    private boolean valido;
    private String mensagemErro;

    /**
     * "ATENDENTE" se o convite foi criado por um GERENTE/ADMINISTRADOR (a pessoa
     * vai virar profissional da empresa do convidador). "GERENTE" se criado por
     * ADMIN global (a pessoa cria empresa própria — fluxo de onboarding).
     */
    private String tipoDestinatario;

    /** Nome da empresa do convidador — exibido na tela de cadastro do atendente. */
    private String empresaNome;

    /**
     * Unidades disponíveis da empresa do convidador (só populadas quando
     * tipoDestinatario = ATENDENTE).
     */
    private List<UnidadeOpcaoDTO> unidadesDisponiveis;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UnidadeOpcaoDTO {
        private Long id;
        private String nome;
    }
}
