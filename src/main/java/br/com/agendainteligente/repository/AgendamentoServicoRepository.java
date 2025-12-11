package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AgendamentoServico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgendamentoServicoRepository extends JpaRepository<AgendamentoServico, Long> {
    List<AgendamentoServico> findByAgendamentoId(Long agendamentoId);
}

