package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.EmpresaEstatisticasDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * #158: KPIs resumidos da empresa pro modal "Editar Empresa".
 * Sem cache — hidrata a cada open do modal (volume baixo, queries count baratas).
 */
@Service
@RequiredArgsConstructor
public class EmpresaEstatisticasService {

    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;

    @PersistenceContext
    private EntityManager em;

    @Transactional(readOnly = true)
    public EmpresaEstatisticasDTO estatisticas(Long empresaId) {
        Empresa empresa = empresaRepository.findById(empresaId)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa não encontrada"));
        validarAcesso(empresa);

        LocalDate hoje = LocalDate.now();
        LocalDateTime inicioMes = hoje.withDayOfMonth(1).atStartOfDay();
        LocalDateTime fimMes = hoje.withDayOfMonth(1).plusMonths(1).atStartOfDay();

        long unidades = countQuery(
                "select count(u) from Unidade u where u.empresa.id = :id", empresaId, null, null);
        long profissionais = countQuery(
                "select count(a) from Atendente a where a.unidade.empresa.id = :id and a.ativo = true",
                empresaId, null, null);
        long agendamentosMes = countQuery(
                "select count(ag) from Agendamento ag where ag.unidade.empresa.id = :id "
                        + "and ag.dataHoraInicio >= :ini and ag.dataHoraInicio < :fim",
                empresaId, inicioMes, fimMes);
        long clientesAtivos = countQuery(
                "select count(c) from Cliente c where c.unidade.empresa.id = :id and c.ativo = true",
                empresaId, null, null);
        long nfseMes = countQuery(
                "select count(n) from NotaFiscal n where n.agendamento.unidade.empresa.id = :id "
                        + "and n.dataEmissao >= :ini and n.dataEmissao < :fim",
                empresaId, inicioMes, fimMes);

        return EmpresaEstatisticasDTO.builder()
                .unidades(unidades)
                .profissionais(profissionais)
                .agendamentosMesAtual(agendamentosMes)
                .clientesAtivos(clientesAtivos)
                .nfseMesAtual(nfseMes)
                .nfseLimiteMes(empresa.getPlano() != null ? empresa.getPlano().getLimiteNfseMes() : null)
                .planoNome(empresa.getPlano() != null ? empresa.getPlano().getNomePublico() : null)
                .planoVencimento(empresa.getPlanoExpiracao())
                .build();
    }

    private long countQuery(String jpql, Long empresaId, LocalDateTime ini, LocalDateTime fim) {
        var q = em.createQuery(jpql, Long.class).setParameter("id", empresaId);
        if (ini != null) q.setParameter("ini", ini).setParameter("fim", fim);
        return q.getSingleResult();
    }

    /** ADMIN global vê qualquer empresa; ADMINISTRADOR só a própria. Demais: nega. */
    private void validarAcesso(Empresa empresa) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BusinessException("Não autorizado");
        }
        Usuario u = usuarioRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMIN) return;
        if (u.getPerfil() == Usuario.PerfilUsuario.ADMINISTRADOR
                && u.getId().equals(empresa.getAdminUnicoId())) return;
        throw new BusinessException("Sem permissão para ver estatísticas desta empresa");
    }
}
