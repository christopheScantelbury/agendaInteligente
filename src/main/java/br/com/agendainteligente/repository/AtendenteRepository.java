package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Atendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AtendenteRepository extends JpaRepository<Atendente, Long> {
    List<Atendente> findByUnidadeIdAndAtivoTrue(Long unidadeId);
    List<Atendente> findByAtivoTrue();
    Optional<Atendente> findByUsuarioId(Long usuarioId);
    List<Atendente> findByUnidadeAdminUnicoId(Long adminUnicoId);

    /** Busca atendentes de um conjunto de unidades — evita findAll() + filtro em memória. */
    @Query("SELECT a FROM Atendente a WHERE a.unidade.id IN :unidadeIds")
    List<Atendente> findByUnidadeIdIn(@Param("unidadeIds") Collection<Long> unidadeIds);
}
