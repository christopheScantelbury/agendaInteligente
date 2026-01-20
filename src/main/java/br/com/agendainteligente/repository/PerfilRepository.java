package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PerfilRepository extends JpaRepository<Perfil, Long> {

    List<Perfil> findByAtivoTrue();

    Optional<Perfil> findByNome(String nome);

    boolean existsByNome(String nome);

    List<Perfil> findBySistemaFalse(); // Apenas perfis customizados
}
