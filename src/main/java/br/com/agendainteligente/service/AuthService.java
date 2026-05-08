package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.CadastroAdminDTO;
import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.dto.TokenDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final br.com.agendainteligente.repository.AtendenteRepository atendenteRepository;
    private final EmpresaRepository empresaRepository;
    private final UnidadeRepository unidadeRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void cadastrar(CadastroAdminDTO cadastroDTO) {
        if (usuarioRepository.existsByEmail(cadastroDTO.getEmail())) {
            throw new BusinessException("Já existe um usuário com este email");
        }

        if (cadastroDTO.getSenha() == null || cadastroDTO.getSenha().trim().length() < 6) {
            throw new BusinessException("A senha deve ter no mínimo 6 caracteres");
        }

        Usuario.PerfilUsuario perfil = cadastroDTO.getQuantidadeUnidades() > 1
                ? Usuario.PerfilUsuario.ADMIN
                : Usuario.PerfilUsuario.ADMINISTRADOR;

        Usuario usuario = Usuario.builder()
                .nome(cadastroDTO.getNome().trim())
                .email(cadastroDTO.getEmail().trim().toLowerCase())
                .senha(passwordEncoder.encode(cadastroDTO.getSenha().trim()))
                .perfilSistema(perfil)
                .telefone(normalizeDigits(cadastroDTO.getTelefone()))
                .areaAtuacao(cadastroDTO.getAreaAtuacao().trim())
                .quantidadeUnidades(cadastroDTO.getQuantidadeUnidades())
                .ativo(true)
                .build();

        usuario = usuarioRepository.save(usuario);
        if (perfil == Usuario.PerfilUsuario.ADMINISTRADOR) {
            usuario.setAdminUnicoId(usuario.getId());
            usuario = usuarioRepository.save(usuario);
        }

        criarEstruturaInicialEmpresaEUnidade(usuario, cadastroDTO.getAreaAtuacao());

        log.info("Usuário cadastrado via /auth/cadastro. Email: {}, Perfil: {}", usuario.getEmail(), perfil);
    }

    @Transactional
    public TokenDTO login(LoginDTO loginDTO) {
        log.debug("Tentativa de login para email: {}", loginDTO.getEmail());

        try {
            // Verificar se o usuário existe antes de autenticar
            Usuario usuario = usuarioRepository.findByEmail(loginDTO.getEmail())
                    .orElseThrow(() -> {
                        log.warn("Usuário não encontrado: {}", loginDTO.getEmail());
                        return new BusinessException("Email ou senha inválidos");
                    });

            if (!usuario.getAtivo()) {
                log.warn("Tentativa de login com usuário inativo: {}", loginDTO.getEmail());
                throw new BusinessException("Usuário inativo");
            }

            // Logs de diagnostico para login em producao (sem expor senha ou hash)
            String senhaArmazenada = usuario.getSenha();
            int lenSenha = senhaArmazenada != null ? senhaArmazenada.length() : 0;
            int lenSenhaTrim = senhaArmazenada != null ? senhaArmazenada.trim().length() : 0;
            boolean matchComRaw = senhaArmazenada != null && passwordEncoder.matches(loginDTO.getSenha(), senhaArmazenada);
            boolean matchComTrim = senhaArmazenada != null && passwordEncoder.matches(loginDTO.getSenha(), senhaArmazenada.trim());
            log.info("[LOGIN-DEBUG] email={} | hashLen={} hashTrimLen={} | matchRaw={} matchTrim={}",
                    loginDTO.getEmail(), lenSenha, lenSenhaTrim, matchComRaw, matchComTrim);

            // Tentar autenticar
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginDTO.getEmail(),
                            loginDTO.getSenha()));

            SecurityContextHolder.getContext().setAuthentication(authentication);

            String token = jwtTokenProvider.generateToken(authentication);

            // Buscar unidadeId se for profissional
            Long unidadeId = null;
            if (usuario.getPerfil() == br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario.PROFISSIONAL) {
                unidadeId = atendenteRepository.findByUsuarioId(usuario.getId())
                        .map(atendente -> atendente.getUnidade().getId())
                        .orElse(null);
            } else if (usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR) {
                unidadeId = unidadeRepository.findByAdminUnicoId(usuario.getId()).stream()
                        .findFirst()
                        .map(Unidade::getId)
                        .orElse(null);
            }

            log.info("Login realizado com sucesso. Email: {}", loginDTO.getEmail());

            // Enviar o nome do perfil customizado quando existir, para o frontend carregar permissoesGranulares corretamente
            String perfilParaToken = (usuario.getPerfilEntity() != null && usuario.getPerfilEntity().getNome() != null)
                    ? usuario.getPerfilEntity().getNome()
                    : usuario.getPerfil().name();

            return TokenDTO.builder()
                    .token(token)
                    .tipo("Bearer")
                    .usuarioId(usuario.getId())
                    .unidadeId(unidadeId)
                    .nome(usuario.getNome())
                    .perfil(perfilParaToken)
                    .build();

        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.error("[LOGIN-DEBUG] BadCredentials para email={} - verifique log anterior (hashLen, matchRaw, matchTrim)", loginDTO.getEmail(), e);
            throw new BusinessException("Email ou senha inválidos");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao realizar login para email: {}", loginDTO.getEmail(), e);
            throw new BusinessException("Email ou senha inválidos");
        }
    }

    private String normalizeDigits(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.length() > 20 ? digits.substring(0, 20) : digits;
    }

    private void criarEstruturaInicialEmpresaEUnidade(Usuario usuario, String areaAtuacao) {
        if (usuario == null) {
            return;
        }

        String areaNormalizada = normalizarTexto(areaAtuacao);
        String sufixoArea = areaNormalizada.isBlank() ? "Geral" : areaNormalizada;
        String nomeEmpresa = limitarTamanho("Empresa - " + sufixoArea, 100);
        String nomeUnidade = limitarTamanho("Unidade Principal", 100);

        Empresa empresa = Empresa.builder()
                .nome(nomeEmpresa)
                .razaoSocial(nomeEmpresa)
                .email(usuario.getEmail())
                .telefone(usuario.getTelefone())
                .ativo(true)
                .corApp("#2563EB")
                .adminUnicoId(usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR ? usuario.getId() : null)
                .build();
        empresa = empresaRepository.save(empresa);

        Unidade unidade = Unidade.builder()
                .nome(nomeUnidade)
                .descricao(limitarTamanho("Unidade inicial criada automaticamente no cadastro", 200))
                .email(usuario.getEmail())
                .telefone(usuario.getTelefone())
                .ativo(true)
                .empresa(empresa)
                .adminUnicoId(usuario.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR ? usuario.getId() : null)
                .build();
        unidadeRepository.save(unidade);
    }

    private String normalizarTexto(String valor) {
        if (valor == null) {
            return "";
        }
        return valor.trim().replaceAll("\\s+", " ");
    }

    private String limitarTamanho(String valor, int tamanhoMaximo) {
        if (valor == null) {
            return null;
        }
        String normalizado = valor.trim();
        if (normalizado.length() <= tamanhoMaximo) {
            return normalizado;
        }
        return normalizado.substring(0, Math.max(0, tamanhoMaximo));
    }
}
