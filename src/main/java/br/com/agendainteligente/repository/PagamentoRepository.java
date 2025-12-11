package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {
    Optional<Pagamento> findByAgendamentoId(Long agendamentoId);
    Optional<Pagamento> findByIdTransacaoGateway(String idTransacaoGateway);
}

