package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    
    List<Agendamento> findByClienteId(Long clienteId);
    
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
           "a.status != 'CANCELADO' AND a.status != 'CONCLUIDO'")
    Optional<Agendamento> findConflitoHorario(@Param("atendenteId") Long atendenteId,
                                               @Param("dataHora") LocalDateTime dataHora, 
                                               @Param("dataHoraFim") LocalDateTime dataHoraFim);
    
    List<Agendamento> findByUnidadeId(Long unidadeId);
    
    List<Agendamento> findByAtendenteId(Long atendenteId);
}

