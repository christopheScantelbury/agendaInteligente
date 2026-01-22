package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Servico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findByAtivoTrue();
    List<Servico> findByUnidadeId(Long unidadeId);
    List<Servico> findByUnidadeIdAndAtivoTrue(Long unidadeId);
}

