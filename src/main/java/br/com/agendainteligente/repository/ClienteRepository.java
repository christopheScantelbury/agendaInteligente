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

    /** Busca todos os IDs de todas as unidades — usado para ADMIN. */
    @Query("SELECT DISTINCT c.unidade.id FROM Cliente c")
    List<Long> findAllUnidadeIds();

    /** Busca clientes da unidade com nome similar ao nome informado (exceto o próprio cliente). */
    @Query("SELECT c FROM Cliente c WHERE c.unidade.id = :unidadeId AND LOWER(c.nome) LIKE LOWER(CONCAT('%', :nome, '%')) AND c.id != :excluirId")
    List<Cliente> findByUnidadeIdAndNomeSimilar(
            @Param("unidadeId") Long unidadeId,
            @Param("nome") String nome,
            @Param("excluirId") Long excluirId);

    /** Busca clientes da unidade com telefone igual ao informado (exceto o próprio). */
    @Query("SELECT c FROM Cliente c WHERE c.unidade.id = :unidadeId AND c.telefone = :telefone AND c.id != :excluirId")
    List<Cliente> findByUnidadeIdAndTelefone(
            @Param("unidadeId") Long unidadeId,
            @Param("telefone") String telefone,
            @Param("excluirId") Long excluirId);

    List<Cliente> findByUnidadeId(Long unidadeId);
}

