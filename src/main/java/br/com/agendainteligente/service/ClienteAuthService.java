package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.dto.ClienteLoginDTO;
import br.com.agendainteligente.dto.ClienteTokenDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClienteAuthService {

    private final ClienteRepository clienteRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public ClienteTokenDTO login(ClienteLoginDTO loginDTO) {
        log.debug("Tentativa de login de cliente: {}", loginDTO.getEmailOuCpf());
        
        // Buscar cliente por email ou CPF/CNPJ
        Cliente cliente = clienteRepository.findByEmail(loginDTO.getEmailOuCpf())
                .orElseGet(() -> clienteRepository.findByCpfCnpj(loginDTO.getEmailOuCpf())
                        .orElseThrow(() -> {
                            log.warn("Cliente não encontrado: {}", loginDTO.getEmailOuCpf());
                            return new BusinessException("Email/CPF ou senha inválidos");
                        }));

        if (!cliente.getAtivo()) {
            log.warn("Tentativa de login com cliente inativo: {}", loginDTO.getEmailOuCpf());
            throw new BusinessException("Cliente inativo");
        }

        if (cliente.getSenha() == null || cliente.getSenha().isEmpty()) {
            log.warn("Cliente sem senha cadastrada: {}", loginDTO.getEmailOuCpf());
            throw new BusinessException("Senha não cadastrada. Entre em contato com o estabelecimento.");
        }

        // Verificar senha
        if (!passwordEncoder.matches(loginDTO.getSenha(), cliente.getSenha())) {
            log.warn("Senha inválida para cliente: {}", loginDTO.getEmailOuCpf());
            throw new BusinessException("Email/CPF ou senha inválidos");
        }

        // Criar autenticação
        String username = cliente.getEmail() != null && !cliente.getEmail().isEmpty() 
                ? cliente.getEmail() 
                : cliente.getCpfCnpj();
        
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                username,
                null,
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_CLIENTE"))
        );

        String token = jwtTokenProvider.generateToken(authentication);
        
        log.info("Login de cliente realizado com sucesso. ID: {}", cliente.getId());
        
        return ClienteTokenDTO.builder()
                .token(token)
                .tipo("Bearer")
                .clienteId(cliente.getId())
                .nome(cliente.getNome())
                .email(cliente.getEmail())
                .build();
    }

    @Transactional
    public void definirSenha(Long clienteId, String senha) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new BusinessException("Cliente não encontrado"));
        
        cliente.setSenha(passwordEncoder.encode(senha));
        clienteRepository.save(cliente);
        
        log.info("Senha definida para cliente ID: {}", clienteId);
    }
}

