package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AnamneseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnamneseTemplateRepository extends JpaRepository<AnamneseTemplate, Long> {
    List<AnamneseTemplate> findByAtivoTrueOrderByNomeAsc();

    /**
     * Lista templates visíveis para um admin: globais (adminUnicoId NULL, seeds
     * V58/V59) + criados pelo próprio admin. ADMIN global passa null para ver todos.
     */
    @Query("SELECT t FROM AnamneseTemplate t WHERE t.ativo = true " +
           "AND (t.adminUnicoId IS NULL OR t.adminUnicoId = :adminUnicoId) " +
           "ORDER BY t.nome ASC")
    List<AnamneseTemplate> findVisiveisPorAdmin(@Param("adminUnicoId") Long adminUnicoId);
}
