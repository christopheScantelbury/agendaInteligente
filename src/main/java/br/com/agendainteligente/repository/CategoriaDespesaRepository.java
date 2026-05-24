package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.CategoriaDespesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoriaDespesaRepository extends JpaRepository<CategoriaDespesa, Long> {

    @Query("SELECT c FROM CategoriaDespesa c WHERE c.adminUnicoId IS NULL OR c.adminUnicoId = :adminUnicoId")
    List<CategoriaDespesa> findVisiveis(@Param("adminUnicoId") Long adminUnicoId);
}
