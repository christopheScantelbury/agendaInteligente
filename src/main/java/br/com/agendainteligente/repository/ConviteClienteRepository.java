package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ConviteCliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConviteClienteRepository extends JpaRepository<ConviteCliente, Long> {
    Optional<ConviteCliente> findByToken(String token);
    List<ConviteCliente> findByCriadoPorIdOrderByDataCriacaoDesc(Long criadoPorId);
    List<ConviteCliente> findByUnidadeIdOrderByDataCriacaoDesc(Long unidadeId);
}
