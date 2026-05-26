package br.com.agendainteligente.repository;

import br.com.agendainteligente.domain.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog> {

    /**
     * Busca paginada com filtros opcionais. Usa Specification em vez de JPQL com
     * {@code :param IS NULL OR ...} porque Hibernate/Postgres não inferia o tipo
     * do parâmetro nulo (causava SQL error em produção — fix do QA Sprint 6).
     */
    default Page<AuditLog> buscarComFiltros(
            String tipoAcao,
            Long autorId,
            Long empresaId,
            LocalDateTime de,
            LocalDateTime ate,
            Pageable pageable
    ) {
        Specification<AuditLog> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            if (tipoAcao != null && !tipoAcao.isBlank()) {
                preds.add(cb.equal(root.get("tipoAcao"), tipoAcao));
            }
            if (autorId != null) {
                preds.add(cb.equal(root.get("autorId"), autorId));
            }
            if (empresaId != null) {
                preds.add(cb.equal(root.get("empresaId"), empresaId));
            }
            if (de != null) {
                preds.add(cb.greaterThanOrEqualTo(root.get("timestamp"), de));
            }
            if (ate != null) {
                preds.add(cb.lessThanOrEqualTo(root.get("timestamp"), ate));
            }
            return preds.isEmpty() ? cb.conjunction() : cb.and(preds.toArray(new Predicate[0]));
        };

        Pageable pageableOrdenado = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Direction.DESC, "timestamp"))
                : pageable;

        return findAll(spec, pageableOrdenado);
    }
}
