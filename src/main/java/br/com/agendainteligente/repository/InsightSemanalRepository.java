package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.InsightSemanal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InsightSemanalRepository extends JpaRepository<InsightSemanal, Long> {
    Optional<InsightSemanal> findByUnidadeIdAndSemana(Long unidadeId, LocalDate semana);
    List<InsightSemanal> findTop4ByUnidadeIdOrderBySemanaDesc(Long unidadeId);
    List<InsightSemanal> findTop4ByUnidadeIdIsNullOrderBySemanaDesc();
}
