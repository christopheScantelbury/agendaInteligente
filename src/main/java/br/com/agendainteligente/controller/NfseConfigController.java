package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.security.SecurityHelper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.security.KeyStore;
import java.security.cert.X509Certificate;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Enumeration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Configuração fiscal por unidade — necessária para emissão de NFS-e.
 * Endpoint dedicado pra ler e atualizar apenas os campos fiscais, sem
 * tocar nos demais dados da unidade (que ficam em /api/unidades).
 *
 * Campos fiscais: razão social, CNPJ, inscrição municipal/estadual,
 * regime tributário, endereço completo, código IBGE do município, e
 * credenciais NotaFácil.
 */
@RestController
@RequestMapping("/api/configuracoes/nfse")
@RequiredArgsConstructor
@Tag(name = "Configuração NFS-e", description = "Dados fiscais por unidade")
public class NfseConfigController {

    private static final Set<String> REGIMES_VALIDOS = Set.of(
            "MEI", "SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"
    );

    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final SecurityHelper securityHelper;

    @GetMapping
    @Operation(summary = "Lista unidades com status fiscal (resumo)")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listar() {
        Empresa empresa = empresaDoUsuario();
        List<Map<String, Object>> body = empresa.getUnidades() == null ? List.of()
                : empresa.getUnidades().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                    .map(this::toResumo)
                    .toList();
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{unidadeId}")
    @Operation(summary = "Buscar dados fiscais completos de uma unidade")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> buscar(@PathVariable Long unidadeId) {
        Unidade unidade = buscarUnidadeDoUsuario(unidadeId);
        return ResponseEntity.ok(toFiscal(unidade));
    }

    @PutMapping("/{unidadeId}")
    @Operation(summary = "Atualizar dados fiscais de uma unidade")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> atualizar(
            @PathVariable Long unidadeId,
            @RequestBody DadosFiscaisRequest req
    ) {
        Unidade unidade = buscarUnidadeDoUsuario(unidadeId);

        if (req.regimeTributario() != null && !req.regimeTributario().isBlank()
                && !REGIMES_VALIDOS.contains(req.regimeTributario())) {
            throw new BusinessException("Regime tributário inválido. Use: " + String.join(", ", REGIMES_VALIDOS));
        }

        // CNPJ: aceita só dígitos (14) ou vazio
        if (req.cnpj() != null && !req.cnpj().isBlank()) {
            String cnpjLimpo = req.cnpj().replaceAll("\\D", "");
            if (cnpjLimpo.length() != 14) {
                throw new BusinessException("CNPJ inválido (precisa ter 14 dígitos)");
            }
            unidade.setCnpj(cnpjLimpo);
        } else {
            unidade.setCnpj(null);
        }

        unidade.setRazaoSocial(emptyToNull(req.razaoSocial()));
        unidade.setInscricaoMunicipal(emptyToNull(req.inscricaoMunicipal()));
        unidade.setInscricaoEstadual(emptyToNull(req.inscricaoEstadual()));
        unidade.setRegimeTributario(emptyToNull(req.regimeTributario()));
        unidade.setEndereco(emptyToNull(req.endereco()));
        unidade.setNumero(emptyToNull(req.numero()));
        unidade.setBairro(emptyToNull(req.bairro()));
        unidade.setCep(req.cep() == null ? null : req.cep().replaceAll("\\D", ""));
        unidade.setCidade(emptyToNull(req.cidade()));
        unidade.setUf(req.uf() == null ? null : req.uf().toUpperCase());
        unidade.setMunicipioIbge(emptyToNull(req.municipioIbge()));
        unidade.setEmail(emptyToNull(req.email()));
        unidade.setTelefone(emptyToNull(req.telefone()));
        // notafacilApiKey só atualiza se vier preenchido (evita apagar acidentalmente)
        if (req.notafacilApiKey() != null && !req.notafacilApiKey().isBlank()) {
            unidade.setNotafacilApiKey(req.notafacilApiKey());
        }
        if (req.notafacilAtivo() != null) {
            unidade.setNotafacilAtivo(req.notafacilAtivo());
        }

        unidadeRepository.save(unidade);
        return ResponseEntity.ok(toFiscal(unidade));
    }

    @PostMapping(value = "/{unidadeId}/certificado", consumes = "multipart/form-data")
    @Operation(summary = "Upload do certificado digital A1 (.pfx/.p12)")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> uploadCertificado(
            @PathVariable Long unidadeId,
            @RequestPart("arquivo") MultipartFile arquivo,
            @RequestPart("senha") String senha
    ) {
        Unidade unidade = buscarUnidadeDoUsuario(unidadeId);

        if (arquivo == null || arquivo.isEmpty()) {
            throw new BusinessException("Arquivo do certificado é obrigatório");
        }
        if (arquivo.getSize() > 5 * 1024 * 1024) {
            throw new BusinessException("Certificado muito grande (máximo 5 MB)");
        }
        if (senha == null || senha.isBlank()) {
            throw new BusinessException("Senha do certificado é obrigatória");
        }

        byte[] pfxBytes;
        try {
            pfxBytes = arquivo.getBytes();
        } catch (Exception e) {
            throw new BusinessException("Não foi possível ler o arquivo");
        }

        // Valida que o PFX abre com a senha + extrai metadados
        KeyStore keystore;
        try {
            keystore = KeyStore.getInstance("PKCS12");
            keystore.load(new ByteArrayInputStream(pfxBytes), senha.toCharArray());
        } catch (java.io.IOException ioe) {
            // IOException com causa UnrecoverableKeyException = senha errada
            throw new BusinessException("Senha incorreta ou arquivo PFX inválido");
        } catch (Exception e) {
            throw new BusinessException("Arquivo não é um PFX/P12 válido: " + e.getMessage());
        }

        // Procura o primeiro alias com cert (geralmente "1" ou nome amigável)
        X509Certificate cert = null;
        try {
            Enumeration<String> aliases = keystore.aliases();
            while (aliases.hasMoreElements()) {
                String alias = aliases.nextElement();
                java.security.cert.Certificate c = keystore.getCertificate(alias);
                if (c instanceof X509Certificate) {
                    cert = (X509Certificate) c;
                    break;
                }
            }
        } catch (Exception e) {
            throw new BusinessException("Não foi possível extrair certificado: " + e.getMessage());
        }
        if (cert == null) {
            throw new BusinessException("Nenhum certificado X.509 encontrado no PFX");
        }

        // Extrai CN do Subject DN — algo como "CN=FULANO:12345678901, OU=..., ..."
        String cn = "—";
        try {
            String dn = cert.getSubjectX500Principal().getName();
            for (String part : dn.split(",")) {
                String p = part.trim();
                if (p.toUpperCase().startsWith("CN=")) {
                    cn = p.substring(3);
                    break;
                }
            }
        } catch (Exception ignored) {}

        LocalDate validoDe = cert.getNotBefore().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        LocalDate validoAte = cert.getNotAfter().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();

        if (validoAte.isBefore(LocalDate.now())) {
            throw new BusinessException("Certificado já está expirado (venceu em " + validoAte + ")");
        }

        // Persiste
        // TODO: criptografar senha (jasypt ou AES-GCM com master key de env). Por
        // ora plaintext — atenção em prod, ver issue de hardening.
        unidade.setCertificadoPfxBase64(Base64.getEncoder().encodeToString(pfxBytes));
        unidade.setCertificadoSenha(senha);
        unidade.setCertificadoCn(cn);
        unidade.setCertificadoValidoDe(validoDe);
        unidade.setCertificadoValidoAte(validoAte);
        unidade.setCertificadoDataUpload(LocalDateTime.now());
        unidadeRepository.save(unidade);

        return ResponseEntity.ok(toFiscal(unidade));
    }

    @DeleteMapping("/{unidadeId}/certificado")
    @Operation(summary = "Remover certificado digital da unidade")
    @PreAuthorize("hasAnyRole('ADMIN','ADMINISTRADOR','GERENTE')")
    @Transactional
    public ResponseEntity<Map<String, Object>> removerCertificado(@PathVariable Long unidadeId) {
        Unidade unidade = buscarUnidadeDoUsuario(unidadeId);
        unidade.setCertificadoPfxBase64(null);
        unidade.setCertificadoSenha(null);
        unidade.setCertificadoCn(null);
        unidade.setCertificadoValidoDe(null);
        unidade.setCertificadoValidoAte(null);
        unidade.setCertificadoDataUpload(null);
        unidadeRepository.save(unidade);
        return ResponseEntity.ok(toFiscal(unidade));
    }

    // === Helpers ===

    private Empresa empresaDoUsuario() {
        Usuario usuario = securityHelper.usuarioAtual();
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        return empresaRepository.findByAdminUnicoId(adminId).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException("Empresa não encontrada para o usuário logado"));
    }

    private Unidade buscarUnidadeDoUsuario(Long unidadeId) {
        Empresa empresa = empresaDoUsuario();
        Unidade unidade = unidadeRepository.findById(unidadeId)
                .orElseThrow(() -> new BusinessException("Unidade não encontrada"));
        if (unidade.getEmpresa() == null || !unidade.getEmpresa().getId().equals(empresa.getId())) {
            throw new BusinessException("Você não tem permissão para editar esta unidade");
        }
        return unidade;
    }

    private String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private boolean preenchido(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private Map<String, Object> toResumo(Unidade u) {
        // MEI emite via NFS-e Nacional (gov.br) — não precisa de Inscrição Municipal.
        // Certificado A1 é OBRIGATÓRIO em todos os regimes (assina o XML do RPS).
        boolean isMei = "MEI".equals(u.getRegimeTributario());
        boolean certVigente = u.getCertificadoValidoAte() != null
                && !u.getCertificadoValidoAte().isBefore(LocalDate.now());
        boolean fiscalOk = preenchido(u.getCnpj())
                && preenchido(u.getRazaoSocial())
                && preenchido(u.getRegimeTributario())
                && (isMei || preenchido(u.getInscricaoMunicipal()))
                && certVigente;
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("unidadeId", u.getId());
        m.put("nome", u.getNome());
        m.put("cnpj", u.getCnpj());
        m.put("inscricaoMunicipal", u.getInscricaoMunicipal());
        m.put("configurada", fiscalOk);
        m.put("notafacilAtivo", Boolean.TRUE.equals(u.getNotafacilAtivo()));
        return m;
    }

    private Map<String, Object> toFiscal(Unidade u) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("unidadeId", u.getId());
        m.put("nome", u.getNome());
        m.put("razaoSocial", u.getRazaoSocial());
        m.put("cnpj", u.getCnpj());
        m.put("inscricaoMunicipal", u.getInscricaoMunicipal());
        m.put("inscricaoEstadual", u.getInscricaoEstadual());
        m.put("regimeTributario", u.getRegimeTributario());
        m.put("endereco", u.getEndereco());
        m.put("numero", u.getNumero());
        m.put("bairro", u.getBairro());
        m.put("cep", u.getCep());
        m.put("cidade", u.getCidade());
        m.put("uf", u.getUf());
        m.put("municipioIbge", u.getMunicipioIbge());
        m.put("email", u.getEmail());
        m.put("telefone", u.getTelefone());
        // Por segurança, não devolve a apiKey completa — só indica se está setada
        m.put("notafacilApiKeyConfigurada", preenchido(u.getNotafacilApiKey()));
        m.put("notafacilAtivo", Boolean.TRUE.equals(u.getNotafacilAtivo()));
        // Certificado: NUNCA devolve PFX nem senha. Só metadados.
        Map<String, Object> cert = new LinkedHashMap<>();
        boolean temCert = preenchido(u.getCertificadoPfxBase64());
        cert.put("configurado", temCert);
        if (temCert) {
            cert.put("cn", u.getCertificadoCn());
            cert.put("validoDe", u.getCertificadoValidoDe());
            cert.put("validoAte", u.getCertificadoValidoAte());
            cert.put("dataUpload", u.getCertificadoDataUpload());
            cert.put("expirado", u.getCertificadoValidoAte() != null
                    && u.getCertificadoValidoAte().isBefore(LocalDate.now()));
            if (u.getCertificadoValidoAte() != null) {
                long dias = java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), u.getCertificadoValidoAte());
                cert.put("diasAteVencer", dias);
            }
        }
        m.put("certificado", cert);
        return m;
    }

    public record DadosFiscaisRequest(
            String razaoSocial,
            String cnpj,
            String inscricaoMunicipal,
            String inscricaoEstadual,
            String regimeTributario,
            String endereco,
            String numero,
            String bairro,
            String cep,
            String cidade,
            String uf,
            String municipioIbge,
            String email,
            String telefone,
            String notafacilApiKey,
            Boolean notafacilAtivo
    ) {}
}
