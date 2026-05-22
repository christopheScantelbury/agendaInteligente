package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AnamneseTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnamneseTemplateRepository extends JpaRepository<AnamneseTemplate, Long> {
    List<AnamneseTemplate> findByAtivoTrueOrderByNomeAsc();
}
