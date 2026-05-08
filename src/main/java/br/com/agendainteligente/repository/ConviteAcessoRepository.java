package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.ConviteAcesso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConviteAcessoRepository extends JpaRepository<ConviteAcesso, Long> {
    Optional<ConviteAcesso> findByToken(String token);
    List<ConviteAcesso> findByCriadoPorIdOrderByDataCriacaoDesc(Long criadoPorId);
}
