package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.ConviteAcesso;
import br.com.agendainteligente.domain.entity.ConviteCliente;
import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Gerente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.*;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.*;
import br.com.agendainteligente.domain.entity.Cliente;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConviteService {

    private static final Pattern ONLY_DIGITS = Pattern.compile("\\D");

    @Value("${app.url-base:http://localhost:5173}")
    private String urlBase;

    private final ConviteAcessoRepository conviteAcessoRepository;
    private final ConviteClienteRepository conviteClienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final GerenteRepository gerenteRepository;
    private final AtendenteRepository atendenteRepository;
    private final ClienteRepository clienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final PerfilService perfilService;
    private final br.com.agendainteligente.repository.PlanoRepository planoRepository;

    private static final String PATH_CONVITES_ACESSO = "/convites-acesso";
    private static final String PATH_CONVITES_CLIENTE = "/convites-cliente";

    private boolean temPermissaoConvitesAcesso(boolean exigeEditar) {
        Usuario u = obterUsuarioLogado();
        // ADMIN global e ADMINISTRADOR (dono da empresa) sempre podem gerenciar links de acesso
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN
                || u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) return true;
        String tipo = obterPermissaoGranular(u, PATH_CONVITES_ACESSO);
        return exigeEditar ? "EDITAR".equals(tipo) : "EDITAR".equals(tipo) || "VISUALIZAR".equals(tipo);
    }

    private boolean temPermissaoConvitesCliente(boolean exigeEditar) {
        Usuario u = obterUsuarioLogado();
        // ADMIN, ADMINISTRADOR e GERENTE podem gerenciar links de convite de cliente
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN
                || u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                || u.getPerfil() == Usuario.PerfilUsuario.GERENTE) return true;
        String tipo = obterPermissaoGranular(u, PATH_CONVITES_CLIENTE);
        return exigeEditar ? "EDITAR".equals(tipo) : "EDITAR".equals(tipo) || "VISUALIZAR".equals(tipo);
    }

    private String obterPermissaoGranular(Usuario usuario, String path) {
        try {
            var dto = perfilService.buscarPerfilDoUsuarioLogado();
            if (dto.getPermissoesGranulares() == null) return null;
            return dto.getPermissoesGranulares().get(path);
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public ConviteAcessoRespostaDTO criarConviteAcesso(ConviteAcessoCriarDTO dto) {
        if (!temPermissaoConvitesAcesso(true)) {
            throw new BusinessException("Sem permissão para criar links de venda de acesso. Verifique o perfil em Perfis e Permissões.");
        }
        if (dto.getDataExpiracaoLink().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Data de expiração do link deve ser futura.");
        }
        if (dto.getDataExpiracaoAcesso().isBefore(java.time.LocalDate.now())) {
            throw new BusinessException("Data de expiração do acesso deve ser futura.");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        Usuario criador = obterUsuarioLogado();
        ConviteAcesso convite = ConviteAcesso.builder()
                .token(token)
                .maxUnidades(dto.getMaxUnidades())
                .dataExpiracaoLink(dto.getDataExpiracaoLink())
                .dataExpiracaoAcesso(dto.getDataExpiracaoAcesso())
                .criadoPor(criador)
                .build();
        convite = conviteAcessoRepository.save(convite);
        // Rota do link depende de QUEM criou (e o que vai ser criado pelo destinatário):
        // - ADMIN global         → /cadastro-administrador (nova empresa + plano)
        // - ADMINISTRADOR        → /cadastro-gerente (vincula à empresa do criador)
        // - GERENTE / outros     → /cadastro-atendente (vira PROFISSIONAL na empresa)
        String rota = rotaCadastroDoConvidador(criador);
        String link = urlBase + rota + "?token=" + token;
        return ConviteAcessoRespostaDTO.builder()
                .id(convite.getId())
                .token(convite.getToken())
                .link(link)
                .maxUnidades(convite.getMaxUnidades())
                .dataExpiracaoLink(convite.getDataExpiracaoLink())
                .dataExpiracaoAcesso(convite.getDataExpiracaoAcesso())
                .usadoEm(convite.getUsadoEm())
                .dataCriacao(convite.getDataCriacao())
                .build();
    }

    @Transactional(readOnly = true)
    public ConviteAcessoInfoDTO obterInfoConviteAcesso(String token) {
        Optional<ConviteAcesso> opt = conviteAcessoRepository.findByToken(token);
        if (opt.isEmpty()) {
            return ConviteAcessoInfoDTO.builder()
                    .token(token)
                    .valido(false)
                    .mensagemErro("Link inválido ou inexistente.")
                    .build();
        }
        ConviteAcesso c = opt.get();
        if (c.isUsado()) {
            return ConviteAcessoInfoDTO.builder()
                    .token(token)
                    .maxUnidades(c.getMaxUnidades())
                    .dataExpiracaoLink(c.getDataExpiracaoLink())
                    .dataExpiracaoAcesso(c.getDataExpiracaoAcesso())
                    .valido(false)
                    .mensagemErro("Este link já foi utilizado.")
                    .build();
        }
        if (c.isLinkExpirado()) {
            return ConviteAcessoInfoDTO.builder()
                    .token(token)
                    .maxUnidades(c.getMaxUnidades())
                    .dataExpiracaoLink(c.getDataExpiracaoLink())
                    .dataExpiracaoAcesso(c.getDataExpiracaoAcesso())
                    .valido(false)
                    .mensagemErro("Este link expirou.")
                    .build();
        }
        // Determina tipo do convite baseado no perfil do criador:
        // - ADMIN global (sem adminUnicoId) → ADMINISTRADOR (nova empresa + plano)
        // - ADMINISTRADOR (dono de tenant)  → GERENTE (na empresa dele)
        // - GERENTE / outros                → ATENDENTE (vira PROFISSIONAL na empresa)
        Usuario criador = c.getCriadoPor();
        String tipo;
        if (criador == null) {
            tipo = "ATENDENTE"; // fallback safe
        } else if (criador.getPerfil() == Usuario.PerfilUsuario.ADMIN
                && criador.getAdminUnicoId() == null) {
            tipo = "ADMINISTRADOR";
        } else if (criador.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            tipo = "GERENTE";
        } else {
            tipo = "ATENDENTE";
        }

        ConviteAcessoInfoDTO.ConviteAcessoInfoDTOBuilder builder = ConviteAcessoInfoDTO.builder()
                .token(token)
                .maxUnidades(c.getMaxUnidades())
                .dataExpiracaoLink(c.getDataExpiracaoLink())
                .dataExpiracaoAcesso(c.getDataExpiracaoAcesso())
                .valido(true)
                .tipoDestinatario(tipo);

        // Popula unidades disponíveis pra GERENTE e ATENDENTE (que vinculam à empresa
        // existente). ADMINISTRADOR vai criar empresa nova — não precisa.
        if (("GERENTE".equals(tipo) || "ATENDENTE".equals(tipo)) && criador != null) {
            List<Unidade> unidadesCriador = unidadesDoUsuario(criador);
            if (!unidadesCriador.isEmpty()) {
                Empresa empresa = unidadesCriador.get(0).getEmpresa();
                builder.empresaNome(empresa != null ? empresa.getNome() : null);
                builder.unidadesDisponiveis(unidadesCriador.stream()
                        .map(u -> ConviteAcessoInfoDTO.UnidadeOpcaoDTO.builder()
                                .id(u.getId())
                                .nome(u.getNome())
                                .build())
                        .collect(Collectors.toList()));
            }
        }
        return builder.build();
    }

    /** Define a rota de cadastro do convite com base no perfil do criador. */
    private String rotaCadastroDoConvidador(Usuario criador) {
        if (criador == null) return "/cadastro-atendente";
        if (criador.getPerfil() == Usuario.PerfilUsuario.ADMIN
                && criador.getAdminUnicoId() == null) {
            return "/cadastro-administrador";
        }
        if (criador.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
            return "/cadastro-gerente";
        }
        return "/cadastro-atendente";
    }

    /**
     * Resolve as unidades visíveis para um usuário (criador de convite).
     * ADMINISTRADOR/GERENTE veem unidades vinculadas via Usuario.unidades; se vazio,
     * caímos pra empresa.unidades via empresaRepository.findByAdminUnicoId.
     */
    private List<Unidade> unidadesDoUsuario(Usuario usuario) {
        if (usuario.getUnidades() != null && !usuario.getUnidades().isEmpty()) {
            return usuario.getUnidades().stream()
                    .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                    .collect(Collectors.toList());
        }
        Long adminId = usuario.getAdminUnicoId() != null ? usuario.getAdminUnicoId() : usuario.getId();
        return unidadeRepository.findByAdminUnicoId(adminId).stream()
                .filter(u -> Boolean.TRUE.equals(u.getAtivo()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void finalizarCadastroAdministrador(String token, FinalizarCadastroAdministradorDTO dto) {
        ConviteAcesso convite = conviteAcessoRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Link inválido ou inexistente."));
        if (convite.isUsado()) {
            throw new BusinessException("Este link já foi utilizado.");
        }
        if (convite.isLinkExpirado()) {
            throw new BusinessException("Este link expirou.");
        }
        if (dto.getUnidades() == null || dto.getUnidades().isEmpty()) {
            throw new BusinessException("Cadastre pelo menos uma unidade.");
        }
        if (dto.getUnidades().size() > convite.getMaxUnidades()) {
            throw new BusinessException("Número de unidades excede o permitido para este link (" + convite.getMaxUnidades() + ").");
        }
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Já existe um usuário cadastrado com este e-mail.");
        }

        Empresa empresa = Empresa.builder()
                .nome(dto.getNomeEmpresa())
                .ativo(true)
                .dataExpiracaoAcesso(convite.getDataExpiracaoAcesso())
                .build();
        empresa = empresaRepository.save(empresa);

        List<Unidade> unidades = new ArrayList<>();
        for (UnidadeMinimaDTO u : dto.getUnidades()) {
            Unidade un = Unidade.builder()
                    .nome(u.getNome().trim())
                    .ativo(true)
                    .empresa(empresa)
                    .build();
            un = unidadeRepository.save(un);
            unidades.add(un);
        }

        Usuario usuario = Usuario.builder()
                .nome(dto.getNome().trim())
                .email(dto.getEmail().trim().toLowerCase())
                .senha(passwordEncoder.encode(dto.getSenha()))
                .ativo(true)
                // Promovido a ADMINISTRADOR (dono do novo tenant) — era GERENTE,
                // mas o convite do ADMIN global cria de fato um administrador.
                .perfilSistema(Usuario.PerfilUsuario.ADMINISTRADOR)
                .perfil(null)
                .unidades(unidades)
                .build();
        usuario = usuarioRepository.save(usuario);

        // adminUnicoId aponta pra si mesmo — esse é o tenant root
        final Long tenantRootId = usuario.getId();
        usuario.setAdminUnicoId(tenantRootId);
        // Empresa também passa a ser do tenant
        empresa.setAdminUnicoId(tenantRootId);
        // E todas as unidades criadas herdam o mesmo tenant
        unidades.forEach(u -> u.setAdminUnicoId(tenantRootId));
        usuarioRepository.save(usuario);
        empresaRepository.save(empresa);
        unidades.forEach(unidadeRepository::save);

        Gerente gerente = Gerente.builder()
                .usuario(usuario)
                .unidade(unidades.get(0))
                .cpf("00000000000")
                .ativo(true)
                .build();
        gerenteRepository.save(gerente);

        // #139: aplica plano. Se dto.planoId vier, usa ele; senão default Trial.
        var plano = dto.getPlanoId() != null
                ? planoRepository.findById(dto.getPlanoId())
                    .orElseThrow(() -> new BusinessException("Plano selecionado não encontrado."))
                : planoRepository.findByNome("TRIAL")
                    .orElseThrow(() -> new BusinessException("Plano Trial não encontrado no catálogo."));
        empresa.setPlano(plano);
        empresa.setPlanoInicio(java.time.LocalDate.now());
        if ("TRIAL".equals(plano.getNome()) && plano.getDuracaoTrialDias() != null) {
            empresa.setPlanoExpiracao(java.time.LocalDate.now().plusDays(plano.getDuracaoTrialDias()));
        } else {
            empresa.setPlanoExpiracao(null); // pagos: vigência rolante via billing
        }
        empresaRepository.save(empresa);
        log.info("Plano aplicado à empresa {}: {} (expira em {})",
                empresa.getId(), plano.getNome(), empresa.getPlanoExpiracao());

        convite.setUsadoEm(LocalDateTime.now());
        conviteAcessoRepository.save(convite);
        log.info("Cadastro ADMINISTRADOR finalizado via convite. Empresa: {}, Usuario: {}", empresa.getNome(), usuario.getEmail());
    }

    /**
     * Finaliza cadastro quando o convite foi criado por um ADMINISTRADOR (dono do tenant).
     * Cria Usuario com perfilSistema=GERENTE + Gerente, vinculados às unidades da empresa
     * do convidador. Não cria empresa nova.
     */
    @Transactional
    public void finalizarCadastroGerente(String token, FinalizarCadastroGerenteDTO dto) {
        ConviteAcesso convite = conviteAcessoRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Link inválido ou inexistente."));
        if (convite.isUsado()) {
            throw new BusinessException("Este link já foi utilizado.");
        }
        if (convite.isLinkExpirado()) {
            throw new BusinessException("Este link expirou.");
        }
        if (convite.getCriadoPor() == null) {
            throw new BusinessException("Convite sem criador — não dá pra resolver a empresa.");
        }
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Já existe um usuário cadastrado com este e-mail.");
        }

        List<Unidade> unidadesCriador = unidadesDoUsuario(convite.getCriadoPor());
        if (unidadesCriador.isEmpty()) {
            throw new BusinessException("O convidador não tem unidades vinculadas. Peça um novo link.");
        }
        java.util.Set<Long> idsPermitidos = unidadesCriador.stream()
                .map(Unidade::getId)
                .collect(Collectors.toSet());
        List<Unidade> unidadesEscolhidas = dto.getUnidadesIds().stream()
                .filter(idsPermitidos::contains)
                .map(id -> unidadesCriador.stream().filter(u -> u.getId().equals(id)).findFirst().orElse(null))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
        if (unidadesEscolhidas.isEmpty()) {
            throw new BusinessException("Selecione pelo menos uma unidade válida.");
        }

        Long adminUnicoIdHerdado = convite.getCriadoPor().getAdminUnicoId() != null
                ? convite.getCriadoPor().getAdminUnicoId()
                : convite.getCriadoPor().getId();

        Usuario usuario = Usuario.builder()
                .nome(dto.getNome().trim())
                .email(dto.getEmail().trim().toLowerCase())
                .senha(passwordEncoder.encode(dto.getSenha()))
                .telefone(dto.getTelefone() != null ? dto.getTelefone().trim() : null)
                .ativo(true)
                .perfilSistema(Usuario.PerfilUsuario.GERENTE)
                .perfil(null)
                .adminUnicoId(adminUnicoIdHerdado)
                .unidades(unidadesEscolhidas)
                .build();
        usuario = usuarioRepository.save(usuario);

        Gerente gerente = Gerente.builder()
                .usuario(usuario)
                .unidade(unidadesEscolhidas.get(0))
                .cpf(dto.getCpf().replaceAll("\\D", ""))
                .ativo(true)
                .build();
        gerenteRepository.save(gerente);

        convite.setUsadoEm(LocalDateTime.now());
        conviteAcessoRepository.save(convite);
        log.info("Cadastro de GERENTE finalizado via convite. Convidador: {}, Gerente: {}, Unidades: {}",
                convite.getCriadoPor().getEmail(), usuario.getEmail(), unidadesEscolhidas.size());
    }

    /**
     * Finaliza cadastro quando o convite foi criado por GERENTE/ADMINISTRADOR.
     * Cria Usuario com perfil PROFISSIONAL + Atendente, ambos vinculados às
     * unidades da empresa do convidador (sem criar empresa nova).
     */
    @Transactional
    public void finalizarCadastroAtendente(String token, FinalizarCadastroAtendenteDTO dto) {
        ConviteAcesso convite = conviteAcessoRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Link inválido ou inexistente."));
        if (convite.isUsado()) {
            throw new BusinessException("Este link já foi utilizado.");
        }
        if (convite.isLinkExpirado()) {
            throw new BusinessException("Este link expirou.");
        }
        if (convite.getCriadoPor() == null) {
            throw new BusinessException("Convite sem criador — não dá pra resolver a empresa.");
        }
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Já existe um usuário cadastrado com este e-mail.");
        }

        // Resolve unidades visíveis ao criador e filtra pelas selecionadas no cadastro
        List<Unidade> unidadesCriador = unidadesDoUsuario(convite.getCriadoPor());
        if (unidadesCriador.isEmpty()) {
            throw new BusinessException("O convidador não tem unidades vinculadas. Peça um novo link.");
        }
        java.util.Set<Long> idsPermitidos = unidadesCriador.stream()
                .map(Unidade::getId)
                .collect(Collectors.toSet());
        List<Unidade> unidadesEscolhidas = dto.getUnidadesIds().stream()
                .filter(idsPermitidos::contains)
                .map(id -> unidadesCriador.stream().filter(u -> u.getId().equals(id)).findFirst().orElse(null))
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toList());
        if (unidadesEscolhidas.isEmpty()) {
            throw new BusinessException("Selecione pelo menos uma unidade válida.");
        }

        // adminUnicoId herdado: aponta pro tenant root (ADMINISTRADOR dono da empresa)
        Long adminUnicoIdHerdado = convite.getCriadoPor().getAdminUnicoId() != null
                ? convite.getCriadoPor().getAdminUnicoId()
                : convite.getCriadoPor().getId();

        Usuario usuario = Usuario.builder()
                .nome(dto.getNome().trim())
                .email(dto.getEmail().trim().toLowerCase())
                .senha(passwordEncoder.encode(dto.getSenha()))
                .telefone(dto.getTelefone() != null ? dto.getTelefone().trim() : null)
                .ativo(true)
                .perfilSistema(Usuario.PerfilUsuario.PROFISSIONAL)
                .perfil(null)
                .adminUnicoId(adminUnicoIdHerdado)
                .unidades(unidadesEscolhidas)
                .build();
        usuario = usuarioRepository.save(usuario);

        Atendente atendente = Atendente.builder()
                .usuario(usuario)
                .unidade(unidadesEscolhidas.get(0))
                .cpf(dto.getCpf().replaceAll("\\D", ""))
                .telefone(dto.getTelefone() != null ? dto.getTelefone().trim() : null)
                .ativo(true)
                .build();
        atendenteRepository.save(atendente);

        convite.setUsadoEm(LocalDateTime.now());
        conviteAcessoRepository.save(convite);
        log.info("Cadastro de atendente finalizado via convite. Convidador: {}, Atendente: {}, Unidades: {}",
                convite.getCriadoPor().getEmail(), usuario.getEmail(), unidadesEscolhidas.size());
    }

    @Transactional
    public ConviteClienteRespostaDTO criarConviteCliente(ConviteClienteCriarDTO dto) {
        if (!temPermissaoConvitesCliente(true)) {
            throw new BusinessException("Sem permissão para criar links de cadastro de clientes. Verifique o perfil em Perfis e Permissões.");
        }
        Usuario gerente = obterUsuarioLogado();
        if (dto.getDataExpiracao().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Data de expiração deve ser futura.");
        }
        Unidade unidade = unidadeRepository.findById(dto.getUnidadeId())
                .orElseThrow(() -> new BusinessException("Unidade não encontrada."));
        if (!pertenceAoGerente(gerente, unidade)) {
            throw new BusinessException("Unidade não pertence às suas unidades.");
        }
        String token = UUID.randomUUID().toString().replace("-", "");
        ConviteCliente convite = ConviteCliente.builder()
                .token(token)
                .unidade(unidade)
                .dataExpiracao(dto.getDataExpiracao())
                .criadoPor(gerente)
                .build();
        convite = conviteClienteRepository.save(convite);
        String link = urlBase + "/cadastro-cliente?token=" + token;
        return ConviteClienteRespostaDTO.builder()
                .id(convite.getId())
                .token(convite.getToken())
                .link(link)
                .unidadeId(unidade.getId())
                .unidadeNome(unidade.getNome())
                .dataExpiracao(convite.getDataExpiracao())
                .usadoEm(convite.getUsadoEm())
                .dataCriacao(convite.getDataCriacao())
                .build();
    }

    @Transactional(readOnly = true)
    public ConviteClienteInfoDTO obterInfoConviteCliente(String token) {
        Optional<ConviteCliente> opt = conviteClienteRepository.findByToken(token);
        if (opt.isEmpty()) {
            return ConviteClienteInfoDTO.builder()
                    .token(token)
                    .valido(false)
                    .mensagemErro("Link inválido ou inexistente.")
                    .build();
        }
        ConviteCliente c = opt.get();
        if (c.isUsado()) {
            return ConviteClienteInfoDTO.builder()
                    .token(token)
                    .unidadeId(c.getUnidade().getId())
                    .unidadeNome(c.getUnidade().getNome())
                    .empresaNome(c.getUnidade().getEmpresa() != null ? c.getUnidade().getEmpresa().getNome() : null)
                    .dataExpiracao(c.getDataExpiracao())
                    .valido(false)
                    .mensagemErro("Este link já foi utilizado.")
                    .build();
        }
        if (c.isExpirado()) {
            return ConviteClienteInfoDTO.builder()
                    .token(token)
                    .unidadeId(c.getUnidade().getId())
                    .unidadeNome(c.getUnidade().getNome())
                    .empresaNome(c.getUnidade().getEmpresa() != null ? c.getUnidade().getEmpresa().getNome() : null)
                    .dataExpiracao(c.getDataExpiracao())
                    .valido(false)
                    .mensagemErro("Este link expirou.")
                    .build();
        }
        return ConviteClienteInfoDTO.builder()
                .token(token)
                .unidadeId(c.getUnidade().getId())
                .unidadeNome(c.getUnidade().getNome())
                .empresaNome(c.getUnidade().getEmpresa() != null ? c.getUnidade().getEmpresa().getNome() : null)
                .dataExpiracao(c.getDataExpiracao())
                .valido(true)
                .build();
    }

    @Transactional
    public void finalizarCadastroCliente(String token, FinalizarCadastroClienteDTO dto) {
        ConviteCliente convite = conviteClienteRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Link inválido ou inexistente."));
        if (convite.isUsado()) {
            throw new BusinessException("Este link já foi utilizado.");
        }
        if (convite.isExpirado()) {
            throw new BusinessException("Este link expirou.");
        }
        if (usuarioRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Já existe um usuário cadastrado com este e-mail.");
        }
        if (clienteRepository.existsByCpfCnpj(normalizeCpfCnpj(dto.getCpfCnpj()))) {
            throw new BusinessException("Já existe um cliente cadastrado com este CPF/CNPJ.");
        }

        Unidade unidade = convite.getUnidade();
        Cliente cliente = Cliente.builder()
                .nome(dto.getNome().trim())
                .cpfCnpj(normalizeCpfCnpj(dto.getCpfCnpj()))
                .email(dto.getEmail().trim().toLowerCase())
                .senha(passwordEncoder.encode(dto.getSenha()))
                .dataNascimento(dto.getDataNascimento())
                .ativo(true)
                .unidade(unidade)
                .unidades(List.of(unidade))
                .build();
        if (dto.getTelefone() != null) cliente.setTelefone(normalizeDigits(dto.getTelefone(), 20));
        if (dto.getRg() != null) cliente.setRg(dto.getRg().trim());
        if (dto.getEndereco() != null) cliente.setEndereco(dto.getEndereco().trim());
        if (dto.getNumero() != null) cliente.setNumero(dto.getNumero().trim());
        if (dto.getComplemento() != null) cliente.setComplemento(dto.getComplemento().trim());
        if (dto.getBairro() != null) cliente.setBairro(dto.getBairro().trim());
        if (dto.getCep() != null) cliente.setCep(normalizeDigits(dto.getCep(), 8));
        if (dto.getCidade() != null) cliente.setCidade(dto.getCidade().trim());
        if (dto.getUf() != null) cliente.setUf(dto.getUf().trim().length() >= 2 ? dto.getUf().trim().substring(0, 2).toUpperCase() : null);
        cliente = clienteRepository.save(cliente);

        Usuario usuario = Usuario.builder()
                .nome(cliente.getNome())
                .email(cliente.getEmail())
                .senha(cliente.getSenha())
                .ativo(true)
                .perfilSistema(Usuario.PerfilUsuario.CLIENTE)
                .perfil(null)
                .cpfCnpj(cliente.getCpfCnpj())
                .dataNascimento(cliente.getDataNascimento())
                .rg(cliente.getRg())
                .endereco(cliente.getEndereco())
                .numero(cliente.getNumero())
                .complemento(cliente.getComplemento())
                .bairro(cliente.getBairro())
                .cep(cliente.getCep())
                .cidade(cliente.getCidade())
                .uf(cliente.getUf())
                .telefone(cliente.getTelefone())
                .unidades(List.of(unidade))
                .build();
        usuarioRepository.save(usuario);

        convite.setUsadoEm(LocalDateTime.now());
        conviteClienteRepository.save(convite);
        log.info("Cadastro cliente finalizado via convite. Cliente: {}, Unidade: {}", cliente.getEmail(), unidade.getNome());
    }

    @Transactional(readOnly = true)
    public List<ConviteAcessoRespostaDTO> listarConvitesAcesso() {
        if (!temPermissaoConvitesAcesso(false)) {
            throw new BusinessException("Sem permissão para listar links de acesso. Verifique o perfil em Perfis e Permissões.");
        }
        Usuario admin = obterUsuarioLogado();
        String rota = rotaCadastroDoConvidador(admin);
        return conviteAcessoRepository.findByCriadoPorIdOrderByDataCriacaoDesc(admin.getId()).stream()
                .map(c -> ConviteAcessoRespostaDTO.builder()
                        .id(c.getId())
                        .token(c.getToken())
                        .link(urlBase + rota + "?token=" + c.getToken())
                        .maxUnidades(c.getMaxUnidades())
                        .dataExpiracaoLink(c.getDataExpiracaoLink())
                        .dataExpiracaoAcesso(c.getDataExpiracaoAcesso())
                        .usadoEm(c.getUsadoEm())
                        .dataCriacao(c.getDataCriacao())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConviteClienteRespostaDTO> listarConvitesCliente() {
        if (!temPermissaoConvitesCliente(false)) {
            throw new BusinessException("Sem permissão para listar links de clientes. Verifique o perfil em Perfis e Permissões.");
        }
        Usuario gerente = obterUsuarioLogado();
        return conviteClienteRepository.findByCriadoPorIdOrderByDataCriacaoDesc(gerente.getId()).stream()
                .map(c -> ConviteClienteRespostaDTO.builder()
                        .id(c.getId())
                        .token(c.getToken())
                        .link(urlBase + "/cadastro-cliente?token=" + c.getToken())
                        .unidadeId(c.getUnidade().getId())
                        .unidadeNome(c.getUnidade().getNome())
                        .dataExpiracao(c.getDataExpiracao())
                        .usadoEm(c.getUsadoEm())
                        .dataCriacao(c.getDataCriacao())
                        .build())
                .toList();
    }

    private Usuario obterUsuarioLogado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Usuário não autenticado.");
        }
        return usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado."));
    }

    private boolean pertenceAoGerente(Usuario gerente, Unidade unidade) {
        if (gerente.getUnidades() == null) return false;
        return gerente.getUnidades().stream().anyMatch(u -> u.getId().equals(unidade.getId()));
    }

    private static String normalizeCpfCnpj(String value) {
        if (value == null) return null;
        String d = ONLY_DIGITS.matcher(value).replaceAll("");
        return d.length() > 14 ? d.substring(0, 14) : d;
    }

    private static String normalizeDigits(String value, int maxLen) {
        if (value == null) return null;
        String d = ONLY_DIGITS.matcher(value).replaceAll("");
        return d.length() > maxLen ? d.substring(0, maxLen) : d;
    }
}
