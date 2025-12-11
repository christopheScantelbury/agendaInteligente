package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.NotaFiscal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotaFiscalRepository extends JpaRepository<NotaFiscal, Long> {
    Optional<NotaFiscal> findByAgendamentoId(Long agendamentoId);
    Optional<NotaFiscal> findByNumeroNfse(String numeroNfse);
}

