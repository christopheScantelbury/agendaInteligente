package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByTokenRecuperacaoSenha(String token);
    boolean existsByEmail(String email);
    List<Usuario> findByAdminUnicoId(Long adminUnicoId);
}
