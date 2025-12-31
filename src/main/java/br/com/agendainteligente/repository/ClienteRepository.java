package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByCpfCnpj(String cpfCnpj);
    Optional<Cliente> findByEmail(String email);
    Optional<Cliente> findByTokenRecuperacaoSenha(String token);
    boolean existsByCpfCnpj(String cpfCnpj);
    boolean existsByEmail(String email);
}

