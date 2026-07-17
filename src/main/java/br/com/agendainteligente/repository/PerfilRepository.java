package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfilRepository extends JpaRepository<Perfil, Long> {

    List<Perfil> findByAtivoTrue();

    Optional<Perfil> findByNome(String nome);

    boolean existsByNome(String nome);

    List<Perfil> findBySistemaFalse(); // Apenas perfis customizados

    // ── #171: escopo por tenant ─────────────────────────────────────────────
    /**
     * Cargos visíveis pro tenant: os globais (perfis de sistema, admin_unico_id
     * NULL) + os próprios. NUNCA usar findAll() nas listagens — ver #SEC02.
     */
    @Query("""
            select p from Perfil p
            where p.ativo = true
              and (p.adminUnicoId is null or p.adminUnicoId = :adminUnicoId)
            order by p.sistema desc, p.nome asc
            """)
    List<Perfil> findVisiveisPorTenant(@Param("adminUnicoId") Long adminUnicoId);

    /** Só os cargos próprios da empresa (exclui os globais de sistema). */
    List<Perfil> findByAdminUnicoIdAndAtivoTrueOrderByNomeAsc(Long adminUnicoId);

    boolean existsByAdminUnicoIdAndNomeIgnoreCase(Long adminUnicoId, String nome);
}
