package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Gerente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GerenteRepository extends JpaRepository<Gerente, Long> {
    Optional<Gerente> findByUsuarioId(Long usuarioId);

    List<Gerente> findByUnidadeId(Long unidadeId);

    List<Gerente> findByUnidadeIdAndAtivoTrue(Long unidadeId);

    boolean existsByUsuarioId(Long usuarioId);
}


