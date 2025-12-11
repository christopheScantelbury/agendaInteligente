package br.com.agendainteligente.domain.entity;

import br.com.agendainteligente.domain.enums.StatusNotaFiscal;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "notas_fiscais")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotaFiscal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agendamento_id", nullable = false, unique = true)
    private Agendamento agendamento;

    @Column(length = 50)
    private String numeroNfse;

    @Column(length = 50)
    private String codigoVerificacao;

    @Column(length = 500)
    private String urlNfse;

    @Column(columnDefinition = "TEXT")
    private String xmlNfse;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StatusNotaFiscal status = StatusNotaFiscal.PENDENTE;

    @Column(length = 1000)
    private String mensagemErro;

    @Column
    private LocalDateTime dataEmissao;

    @Column(nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column
    private LocalDateTime dataAtualizacao;

    @PrePersist
    protected void onCreate() {
        dataCriacao = LocalDateTime.now();
        dataAtualizacao = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        dataAtualizacao = LocalDateTime.now();
    }
}

