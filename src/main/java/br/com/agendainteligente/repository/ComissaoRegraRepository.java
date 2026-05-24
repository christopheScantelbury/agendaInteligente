package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ComissaoRegra;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComissaoRegraRepository extends JpaRepository<ComissaoRegra, Long> {

    List<ComissaoRegra> findByAtendenteId(Long atendenteId);

    @Query("SELECT r FROM ComissaoRegra r WHERE r.atendente.id = :atendenteId AND r.servico.id = :servicoId")
    Optional<ComissaoRegra> findByAtendenteAndServico(@Param("atendenteId") Long atendenteId,
                                                      @Param("servicoId") Long servicoId);

    @Query("SELECT r FROM ComissaoRegra r WHERE r.atendente.id = :atendenteId AND r.servico IS NULL")
    Optional<ComissaoRegra> findRegraPadrao(@Param("atendenteId") Long atendenteId);
}
