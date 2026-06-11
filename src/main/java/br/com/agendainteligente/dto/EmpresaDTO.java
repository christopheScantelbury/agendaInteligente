package br.com.agendainteligente.dto;

import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmpresaDTO {

    private Long id;

    @NotBlank(message = "Nome é obrigatório")
    private String nome;

    private String razaoSocial;
    private String cnpj;
    private String email;
    private String telefone;
    private String endereco;
    private String numero;
    private String bairro;
    private String cep;
    private String cidade;
    private String uf;
    private Boolean ativo;

    private java.time.LocalDate dataExpiracaoAcesso;

    private String logo;
    private String corApp;

    private CategoriaEmpresa categoria;

    // ── Link público (#158) ──
    /** Slug usado em /e/{slug}. a-z, 0-9, hífen; 3-60 chars; único. */
    private String slugPublico;

    // ── Plano comercial (#158 — read-only no DTO; troca via POST /{id}/plano) ──
    private Long planoId;
    private String planoNome;
    private java.math.BigDecimal planoPreco;
    private java.time.LocalDate planoInicio;
    private java.time.LocalDate planoExpiracao;
}
