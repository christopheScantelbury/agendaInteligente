package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Plano;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanoRepository extends JpaRepository<Plano, Long> {
    List<Plano> findByAtivoTrueOrderByOrdemAsc();
    Optional<Plano> findByNome(String nome);
}
