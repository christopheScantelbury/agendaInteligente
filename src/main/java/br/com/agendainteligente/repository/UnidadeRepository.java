package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Unidade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UnidadeRepository extends JpaRepository<Unidade, Long> {
    List<Unidade> findByAtivoTrue();
    List<Unidade> findByClinicaIdAndAtivoTrue(Long clinicaId);
}

