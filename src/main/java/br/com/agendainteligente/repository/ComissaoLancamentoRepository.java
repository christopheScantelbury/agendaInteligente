package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ComissaoLancamento;
import br.com.agendainteligente.domain.enums.StatusComissao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ComissaoLancamentoRepository extends JpaRepository<ComissaoLancamento, Long> {

    List<ComissaoLancamento> findByAtendenteIdAndStatus(Long atendenteId, StatusComissao status);

    boolean existsByAgendamentoServicoId(Long agendamentoServicoId);

    @Query("SELECT COALESCE(SUM(l.valorComissao), 0) FROM ComissaoLancamento l " +
            "WHERE l.atendente.id = :atendenteId AND l.status = :status")
    BigDecimal somar(@Param("atendenteId") Long atendenteId, @Param("status") StatusComissao status);

    List<ComissaoLancamento> findByPagamentoId(Long pagamentoId);
}
