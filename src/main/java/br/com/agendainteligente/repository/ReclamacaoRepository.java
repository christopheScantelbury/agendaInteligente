package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Reclamacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReclamacaoRepository extends JpaRepository<Reclamacao, Long> {

    List<Reclamacao> findByUnidadeIdOrderByDataCriacaoDesc(Long unidadeId);

    List<Reclamacao> findByLidaFalseOrderByDataCriacaoDesc();

    List<Reclamacao> findByUnidadeIdAndLidaFalseOrderByDataCriacaoDesc(Long unidadeId);

    @Query("SELECT COUNT(r) FROM Reclamacao r WHERE r.lida = false")
    Long countByLidaFalse();

    @Query("SELECT COUNT(r) FROM Reclamacao r WHERE r.unidadeId = :unidadeId AND r.lida = false")
    Long countByUnidadeIdAndLidaFalse(Long unidadeId);
}
