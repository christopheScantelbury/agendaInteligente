package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Clinica;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClinicaRepository extends JpaRepository<Clinica, Long> {
    List<Clinica> findByAtivoTrue();
    Optional<Clinica> findByCnpj(String cnpj);
    boolean existsByCnpj(String cnpj);
}

