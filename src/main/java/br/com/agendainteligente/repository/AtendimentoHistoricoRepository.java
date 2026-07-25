package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AtendimentoHistorico;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AtendimentoHistoricoRepository extends JpaRepository<AtendimentoHistorico, Long> {

    /** Ordem cronológica: o 1º é a "cliente nova", os seguintes viram "Atendimento N". */
    List<AtendimentoHistorico> findByClienteIdOrderByDataAscIdAsc(Long clienteId);
}
