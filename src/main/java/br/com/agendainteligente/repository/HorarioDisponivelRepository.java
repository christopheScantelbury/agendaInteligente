package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.HorarioDisponivel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HorarioDisponivelRepository extends JpaRepository<HorarioDisponivel, Long> {
    List<HorarioDisponivel> findByAtendenteId(Long atendenteId);
    
    @Query("SELECT h FROM HorarioDisponivel h WHERE h.atendente.id = :atendenteId AND h.disponivel = true AND h.dataHoraInicio >= :dataInicio AND h.dataHoraFim <= :dataFim ORDER BY h.dataHoraInicio")
    List<HorarioDisponivel> findByAtendenteAndPeriodo(@Param("atendenteId") Long atendenteId, 
                                                       @Param("dataInicio") LocalDateTime dataInicio,
                                                       @Param("dataFim") LocalDateTime dataFim);
    
    @Query("SELECT h FROM HorarioDisponivel h WHERE h.disponivel = true AND " +
           "((:dataHora BETWEEN h.dataHoraInicio AND h.dataHoraFim) OR " +
           "(h.dataHoraInicio BETWEEN :dataHora AND :dataHoraFim))")
    List<HorarioDisponivel> findHorariosDisponiveisNoPeriodo(@Param("dataHora") LocalDateTime dataHora,
                                                               @Param("dataHoraFim") LocalDateTime dataHoraFim);
    
    @Query("SELECT h FROM HorarioDisponivel h WHERE h.atendente.id = :atendenteId AND h.disponivel = true AND " +
           "((:dataHora BETWEEN h.dataHoraInicio AND h.dataHoraFim) OR " +
           "(h.dataHoraInicio BETWEEN :dataHora AND :dataHoraFim) OR " +
           "(:dataHoraFim BETWEEN h.dataHoraInicio AND h.dataHoraFim) OR " +
           "(h.dataHoraFim BETWEEN :dataHora AND :dataHoraFim))")
    Optional<HorarioDisponivel> findHorarioDisponivelPorAtendenteEPeriodo(@Param("atendenteId") Long atendenteId,
                                                                           @Param("dataHora") LocalDateTime dataHora,
                                                                           @Param("dataHoraFim") LocalDateTime dataHoraFim);
}

