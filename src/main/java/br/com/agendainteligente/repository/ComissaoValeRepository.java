package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ComissaoVale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface ComissaoValeRepository extends JpaRepository<ComissaoVale, Long> {

    List<ComissaoVale> findByAtendenteIdAndStatusOrderByDataValeDesc(Long atendenteId, ComissaoVale.Status status);

    List<ComissaoVale> findByAtendenteIdOrderByDataValeDesc(Long atendenteId);

    List<ComissaoVale> findByPagamentoId(Long pagamentoId);

    @org.springframework.data.jpa.repository.Query(
        "select coalesce(sum(v.valor), 0) from ComissaoVale v " +
        "where v.atendente.id = :atendenteId and v.status = 'PENDENTE'")
    BigDecimal somaPendentesPorAtendente(Long atendenteId);
}
