package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    
    List<Agendamento> findByClienteId(Long clienteId);

    List<Agendamento> findByClienteIdAndStatusOrderByDataHoraInicioDesc(Long clienteId, StatusAgendamento status);
    
    List<Agendamento> findByStatus(StatusAgendamento status);
    
    @Query("SELECT a FROM Agendamento a WHERE a.dataHoraInicio BETWEEN :inicio AND :fim")
    List<Agendamento> findByPeriodo(@Param("inicio") LocalDateTime inicio, 
                                     @Param("fim") LocalDateTime fim);
    
    @Query("SELECT a FROM Agendamento a WHERE " +
           "a.atendente.id = :atendenteId AND " +
           "((:dataHora BETWEEN a.dataHoraInicio AND a.dataHoraFim OR " +
           "a.dataHoraInicio BETWEEN :dataHora AND :dataHoraFim) OR " +
           "(:dataHoraFim BETWEEN a.dataHoraInicio AND a.dataHoraFim OR " +
           "a.dataHoraFim BETWEEN :dataHora AND :dataHoraFim)) AND " +
           "a.status != 'CANCELADO' AND a.status != 'CONCLUIDO' AND a.status != 'NO_SHOW'")
    Optional<Agendamento> findConflitoHorario(@Param("atendenteId") Long atendenteId,
                                               @Param("dataHora") LocalDateTime dataHora, 
                                               @Param("dataHoraFim") LocalDateTime dataHoraFim);

    @Query("SELECT a FROM Agendamento a WHERE a.id != :excluirId AND " +
           "a.atendente.id = :atendenteId AND " +
           "((:dataHora BETWEEN a.dataHoraInicio AND a.dataHoraFim OR " +
           "a.dataHoraInicio BETWEEN :dataHora AND :dataHoraFim) OR " +
           "(:dataHoraFim BETWEEN a.dataHoraInicio AND a.dataHoraFim OR " +
           "a.dataHoraFim BETWEEN :dataHora AND :dataHoraFim)) AND " +
           "a.status != 'CANCELADO' AND a.status != 'CONCLUIDO' AND a.status != 'NO_SHOW'")
    Optional<Agendamento> findConflitoHorarioExcluindoId(@Param("atendenteId") Long atendenteId,
                                                          @Param("dataHora") LocalDateTime dataHora,
                                                          @Param("dataHoraFim") LocalDateTime dataHoraFim,
                                                          @Param("excluirId") Long excluirId);
    
    List<Agendamento> findByUnidadeId(Long unidadeId);
    
    List<Agendamento> findByAtendenteId(Long atendenteId);

    Optional<Agendamento> findFirstByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNotOrderByDataHoraInicioAsc(
            Long clienteId,
            Long unidadeId,
            StatusAgendamento status,
            LocalDateTime inicioDia,
            LocalDateTime fimDia,
            Long idNot
    );

    List<Agendamento> findByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNot(
            Long clienteId,
            Long unidadeId,
            StatusAgendamento status,
            LocalDateTime inicioDia,
            LocalDateTime fimDia,
            Long idNot
    );

    boolean existsByClienteIdAndUnidadeIdAndStatusAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndValorFinalGreaterThan(
            Long clienteId,
            Long unidadeId,
            StatusAgendamento status,
            LocalDateTime inicioDia,
            LocalDateTime fimDia,
            BigDecimal valorMinimo
    );

    boolean existsByClienteIdAndUnidadeIdAndDataHoraInicioGreaterThanEqualAndDataHoraInicioLessThanAndIdNotAndStatusIn(
            Long clienteId,
            Long unidadeId,
            LocalDateTime inicioDia,
            LocalDateTime fimDia,
            Long idNot,
            List<StatusAgendamento> statuses
    );

    @Query(value = """
            SELECT
              EXTRACT(HOUR FROM data_hora_inicio)::int AS hora,
              EXTRACT(DOW FROM data_hora_inicio)::int AS dia_semana,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_shows
            FROM agendamentos
            WHERE unidade_id = :unidadeId
              AND data_hora_inicio >= :inicio
            GROUP BY 1, 2
            ORDER BY total DESC
            """, nativeQuery = true)
    List<Object[]> findHorariosPopularesPorUnidade(
            @Param("unidadeId") Long unidadeId,
            @Param("inicio") LocalDateTime inicio);

    @Query(value = """
            SELECT
              EXTRACT(HOUR FROM data_hora_inicio)::int AS hora,
              EXTRACT(DOW FROM data_hora_inicio)::int AS dia_semana,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'NO_SHOW') AS no_shows
            FROM agendamentos
            WHERE data_hora_inicio >= :inicio
            GROUP BY 1, 2
            ORDER BY total DESC
            """, nativeQuery = true)
    List<Object[]> findHorariosPopularesGlobal(@Param("inicio") LocalDateTime inicio);

    @Query("SELECT a FROM Agendamento a WHERE a.cliente.id = :clienteId ORDER BY a.dataHoraInicio DESC")
    List<Agendamento> findByClienteIdOrderByDataDesc(@Param("clienteId") Long clienteId);

    @Query("SELECT a FROM Agendamento a WHERE a.unidade.id = :unidadeId AND a.dataHoraInicio >= :inicio ORDER BY a.dataHoraInicio DESC")
    List<Agendamento> findByUnidadeIdAndPeriodo(
            @Param("unidadeId") Long unidadeId,
            @Param("inicio") LocalDateTime inicio);

    // ── Relatórios ─────────────────────────────────────────────────────────────

    @Query(value = """
            SELECT
              TO_CHAR(a.data_hora_inicio, 'YYYY-MM') AS mes,
              COUNT(*)                                AS total_agendamentos,
              SUM(a.valor_final)                      AS faturamento
            FROM agendamentos a
            WHERE a.status IN ('CONCLUIDO','FINALIZADO')
              AND a.data_hora_inicio BETWEEN :inicio AND :fim
              AND (:unidadeId IS NULL OR a.unidade_id = :unidadeId)
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findFaturamentoMensal(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            @Param("unidadeId") Long unidadeId);

    @Query(value = """
            SELECT
              s.nome                     AS servico_nome,
              COUNT(ags.id)              AS total_realizados,
              SUM(ags.valor)             AS receita_total
            FROM agendamento_servicos ags
            JOIN servicos s ON s.id = ags.servico_id
            JOIN agendamentos a ON a.id = ags.agendamento_id
            WHERE a.status IN ('CONCLUIDO','FINALIZADO')
              AND a.data_hora_inicio BETWEEN :inicio AND :fim
              AND (:unidadeId IS NULL OR a.unidade_id = :unidadeId)
            GROUP BY s.nome
            ORDER BY total_realizados DESC
            LIMIT 10
            """, nativeQuery = true)
    List<Object[]> findTopServicos(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            @Param("unidadeId") Long unidadeId);

    @Query(value = """
            SELECT
              TO_CHAR(a.data_hora_inicio, 'YYYY-MM') AS mes,
              COUNT(DISTINCT a.cliente_id)            AS clientes_unicos,
              COUNT(DISTINCT CASE WHEN cnt.total > 1 THEN a.cliente_id END) AS clientes_retorno
            FROM agendamentos a
            JOIN (
              SELECT cliente_id, COUNT(*) AS total
              FROM agendamentos
              WHERE status IN ('CONCLUIDO','FINALIZADO')
                AND data_hora_inicio BETWEEN :inicio AND :fim
                AND (:unidadeId IS NULL OR unidade_id = :unidadeId)
              GROUP BY cliente_id
            ) cnt ON cnt.cliente_id = a.cliente_id
            WHERE a.status IN ('CONCLUIDO','FINALIZADO')
              AND a.data_hora_inicio BETWEEN :inicio AND :fim
              AND (:unidadeId IS NULL OR a.unidade_id = :unidadeId)
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findTaxaRetorno(
            @Param("inicio") LocalDateTime inicio,
            @Param("fim") LocalDateTime fim,
            @Param("unidadeId") Long unidadeId);
}
