package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgendamentoServicoRepository extends JpaRepository<AgendamentoServico, Long> {
    List<AgendamentoServico> findByAgendamentoId(Long agendamentoId);
    void deleteByAgendamentoId(Long agendamentoId);

    /**
     * Itens de agendamento cujo atendente efetivo (próprio do item OU herdado do
     * agendamento) é o atendenteId informado, com agendamento no status indicado.
     * Usado por ComissaoService.listarPendentes (#155).
     *
     * IMPORTANTE: `LEFT JOIN s.atendente` explícito é obrigatório aqui. Path
     * expression `s.atendente.id` no WHERE faz o JPA gerar INNER JOIN implícito,
     * o que excluiria items com `atendente IS NULL` (caso do atendente principal
     * que herda do agendamento). Bug crítico que o QA pegou — itens herdando do
     * principal nunca geravam comissão.
     */
    @Query("""
            select s from AgendamentoServico s
            join s.agendamento a
            left join s.atendente sa
            where a.status = :status
              and (
                sa.id = :atendenteId
                or (sa is null and a.atendente.id = :atendenteId)
              )
            """)
    List<AgendamentoServico> findByAtendenteEfetivoAndAgendamentoStatus(
            @Param("atendenteId") Long atendenteId,
            @Param("status") StatusAgendamento status);
}
