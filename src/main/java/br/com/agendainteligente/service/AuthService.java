package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.LoginDTO;
import br.com.agendainteligente.dto.TokenDTO;
import br.com.agendainteligente.exception.BusinessException;
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
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

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

            log.debug("Usuário encontrado. Verificando senha...");

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
            }

            log.info("Login realizado com sucesso. Email: {}", loginDTO.getEmail());

            return TokenDTO.builder()
                    .token(token)
                    .tipo("Bearer")
                    .usuarioId(usuario.getId())
                    .unidadeId(unidadeId)
                    .nome(usuario.getNome())
                    .perfil(usuario.getPerfil().name())
                    .build();

        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.error("Credenciais inválidas para email: {}", loginDTO.getEmail(), e);
            throw new BusinessException("Email ou senha inválidos");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao realizar login para email: {}", loginDTO.getEmail(), e);
            throw new BusinessException("Email ou senha inválidos");
        }
    }
}
