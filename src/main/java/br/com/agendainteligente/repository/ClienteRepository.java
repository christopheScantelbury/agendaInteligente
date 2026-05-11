package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    Optional<Cliente> findByCpfCnpj(String cpfCnpj);
    Optional<Cliente> findByEmail(String email);
    Optional<Cliente> findByTokenRecuperacaoSenha(String token);
    boolean existsByCpfCnpj(String cpfCnpj);
    boolean existsByEmail(String email);

    /** Busca clientes de um conjunto de unidades — evita findAll() + filtro em memória. */
    @Query("SELECT c FROM Cliente c WHERE c.unidade.id IN :unidadeIds")
    List<Cliente> findByUnidadeIdIn(@Param("unidadeIds") Collection<Long> unidadeIds);
}

