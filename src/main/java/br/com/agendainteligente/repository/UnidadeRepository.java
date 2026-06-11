package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Unidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface UnidadeRepository extends JpaRepository<Unidade, Long> {
    List<Unidade> findByAtivoTrue();
    List<Unidade> findByAdminUnicoId(Long adminUnicoId);

    /** Retorna apenas os IDs de todas as unidades — evita carregar entidades completas para ADMIN. */
    @Query("SELECT u.id FROM Unidade u")
    List<Long> findAllIds();

    /** Retorna IDs de empresa de um conjunto de unidades — usado para resolver empresa sem lazy-load. */
    @Query("SELECT u.empresa.id FROM Unidade u WHERE u.id IN :ids AND u.empresa IS NOT NULL")
    List<Long> findEmpresaIdsByIds(@Param("ids") Collection<Long> ids);

    /** Retorna unidades cujas empresas estejam no conjunto informado. */
    @Query("SELECT u FROM Unidade u WHERE u.empresa.id IN :empresaIds")
    List<Unidade> findByEmpresaIdIn(@Param("empresaIds") Collection<Long> empresaIds);

    /** #158: KPIs do modal Editar Empresa. */
    long countByEmpresaId(Long empresaId);
}
