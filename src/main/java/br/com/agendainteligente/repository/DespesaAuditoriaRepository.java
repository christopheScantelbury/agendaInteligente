package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.DespesaAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DespesaAuditoriaRepository extends JpaRepository<DespesaAuditoria, Long> {
    List<DespesaAuditoria> findByDespesaIdOrderByDataAcaoDesc(Long despesaId);
}
