package br.com.agendainteligente.domain.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "reclamacoes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reclamacao {

    public enum Categoria {
        RECLAMACAO, SUGESTAO, ELOGIO
    }

    public enum Status {
        RECEBIDA, EM_ANALISE, RESOLVIDA, ARQUIVADA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String mensagem;

    @Column(name = "unidade_id")
    private Long unidadeId;

    // Contato opcional do reclamante — quando preenchido, habilita resposta direta
    @Column(name = "nome_reclamante", length = 150)
    private String nomeReclamante;

    @Column(name = "email_reclamante", length = 255)
    private String emailReclamante;

    @Column(name = "telefone_reclamante", length = 20)
    private String telefoneReclamante;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Categoria categoria = Categoria.RECLAMACAO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.RECEBIDA;

    @Column(nullable = false)
    @Builder.Default
    private Boolean lida = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataLeitura;

    @Column(columnDefinition = "TEXT")
    private String resposta;

    @Column(name = "data_resposta")
    private LocalDateTime dataResposta;

    @Column(name = "respondida_por", length = 255)
    private String respondidaPor;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        if (categoria == null) categoria = Categoria.RECLAMACAO;
        if (status == null) status = Status.RECEBIDA;
    }

    @PreUpdate
    protected void onUpdate() {
        if (Boolean.TRUE.equals(lida) && dataLeitura == null) {
            dataLeitura = LocalDateTime.now();
        }
    }
}
