package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    @Query("""
        SELECT a FROM AuditLog a
        WHERE (:tipoAcao IS NULL OR a.tipoAcao = :tipoAcao)
          AND (:autorId IS NULL OR a.autorId = :autorId)
          AND (:empresaId IS NULL OR a.empresaId = :empresaId)
          AND (:de IS NULL OR a.timestamp >= :de)
          AND (:ate IS NULL OR a.timestamp <= :ate)
        ORDER BY a.timestamp DESC
        """)
    Page<AuditLog> buscarComFiltros(
            @Param("tipoAcao") String tipoAcao,
            @Param("autorId") Long autorId,
            @Param("empresaId") Long empresaId,
            @Param("de") LocalDateTime de,
            @Param("ate") LocalDateTime ate,
            Pageable pageable
    );
}
