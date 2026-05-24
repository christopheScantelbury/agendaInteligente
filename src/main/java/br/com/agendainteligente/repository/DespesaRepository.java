package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Despesa;
import br.com.agendainteligente.domain.enums.StatusDespesa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface DespesaRepository extends JpaRepository<Despesa, Long> {

    List<Despesa> findByUnidadeIdInOrderByDataVencimentoDesc(Collection<Long> unidadeIds);

    @Query("SELECT d FROM Despesa d WHERE d.unidade.id IN :unidadeIds " +
            "AND d.dataCompetencia BETWEEN :inicio AND :fim ORDER BY d.dataVencimento DESC")
    List<Despesa> findByPeriodo(@Param("unidadeIds") Collection<Long> unidadeIds,
                                @Param("inicio") LocalDate inicio,
                                @Param("fim") LocalDate fim);

    @Query("SELECT COALESCE(SUM(d.valor), 0) FROM Despesa d " +
            "WHERE d.unidade.id IN :unidadeIds AND d.status = :status " +
            "AND d.dataCompetencia BETWEEN :inicio AND :fim")
    BigDecimal somarPorStatusEPeriodo(@Param("unidadeIds") Collection<Long> unidadeIds,
                                      @Param("status") StatusDespesa status,
                                      @Param("inicio") LocalDate inicio,
                                      @Param("fim") LocalDate fim);

    @Query("SELECT COALESCE(SUM(d.valor), 0) FROM Despesa d " +
            "WHERE d.unidade.id IN :unidadeIds AND d.status = 'PAGA' " +
            "AND d.dataPagamento BETWEEN :inicio AND :fim")
    BigDecimal somarPagasPorDataPagamento(@Param("unidadeIds") Collection<Long> unidadeIds,
                                          @Param("inicio") LocalDate inicio,
                                          @Param("fim") LocalDate fim);
}
