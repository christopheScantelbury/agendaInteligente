package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Anamnese;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnamneseRepository extends JpaRepository<Anamnese, Long> {
    List<Anamnese> findByClienteIdOrderByDataDesc(Long clienteId);
    List<Anamnese> findByClienteIdAndUnidadeIdOrderByDataDesc(Long clienteId, Long unidadeId);
    List<Anamnese> findByUnidadeIdOrderByDataDesc(Long unidadeId);
}
