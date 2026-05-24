package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ComissaoPagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComissaoPagamentoRepository extends JpaRepository<ComissaoPagamento, Long> {
    List<ComissaoPagamento> findByAtendenteIdOrderByDataPagamentoDesc(Long atendenteId);
}
