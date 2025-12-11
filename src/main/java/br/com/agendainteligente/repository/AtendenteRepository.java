package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Atendente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AtendenteRepository extends JpaRepository<Atendente, Long> {
    List<Atendente> findByUnidadeIdAndAtivoTrue(Long unidadeId);
    List<Atendente> findByAtivoTrue();
    Optional<Atendente> findByUsuarioId(Long usuarioId);
}

