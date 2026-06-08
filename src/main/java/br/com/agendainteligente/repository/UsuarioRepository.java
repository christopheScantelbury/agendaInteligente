package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.List;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByTokenRecuperacaoSenha(String token);
    boolean existsByEmail(String email);
    List<Usuario> findByAdminUnicoId(Long adminUnicoId);

    /**
     * Usuários que possuem ao menos UMA unidade no conjunto informado (via tabela usuario_unidades).
     * DISTINCT para evitar duplicatas pelo JOIN. Usado por GERENTE/PROFISSIONAL para
     * filtrar listagem sem `findAll().stream().filter(...)` em memória.
     */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.unidades un WHERE un.id IN :unidadeIds")
    List<Usuario> findDistinctByUnidadesIdIn(@Param("unidadeIds") Collection<Long> unidadeIds);
}
