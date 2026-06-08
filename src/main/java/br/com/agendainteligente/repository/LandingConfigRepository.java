package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.LandingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LandingConfigRepository extends JpaRepository<LandingConfig, Long> {
}
