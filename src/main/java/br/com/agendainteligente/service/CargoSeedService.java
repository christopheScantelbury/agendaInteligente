package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import br.com.agendainteligente.repository.PerfilRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * #171: cria os cargos iniciais de um tenant recém-cadastrado.
 *
 * O nome do cargo é do vocabulário da empresa ("Cabeleireiro(a)", "Dentista"),
 * mas o PODER vem do {@code perfilSistemaBase}. A empresa renomeia/adiciona à
 * vontade depois em Perfis e Permissões.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CargoSeedService {

    private final PerfilRepository perfilRepository;

    private static final String PERM_GERENTE = """
            {
              "/": "EDITAR",
              "/agendamentos": "EDITAR",
              "/clientes": "EDITAR",
              "/servicos": "EDITAR",
              "/profissionais": "EDITAR",
              "/comissoes": "EDITAR",
              "/despesas": "EDITAR",
              "/relatorios": "VISUALIZAR",
              "/convites-cliente": "EDITAR"
            }""";

    private static final String PERM_RECEPCAO = """
            {
              "/": "EDITAR",
              "/agendamentos": "EDITAR",
              "/clientes": "EDITAR",
              "/servicos": "VISUALIZAR",
              "/convites-cliente": "EDITAR"
            }""";

    private static final String PERM_PROFISSIONAL = """
            {
              "/": "VISUALIZAR",
              "/agendamentos": "EDITAR",
              "/clientes": "VISUALIZAR",
              "/servicos": "VISUALIZAR"
            }""";

    /**
     * Semeia os cargos padrão do tenant. Idempotente: cargo já existente (mesmo
     * nome no tenant) é ignorado, então rodar de novo não duplica nem
     * sobrescreve renomeações feitas pela empresa.
     */
    @Transactional
    public List<Perfil> seedCargosDoTenant(Long adminUnicoId, CategoriaEmpresa categoria) {
        if (adminUnicoId == null) return List.of();
        CategoriaEmpresa cat = categoria != null ? categoria : CategoriaEmpresa.OUTROS;

        List<Perfil> criados = new ArrayList<>();
        criar(criados, adminUnicoId, nomeGerente(cat), "Administra a unidade: agenda, equipe, serviços e financeiro",
                Usuario.PerfilUsuario.GERENTE, PERM_GERENTE);
        criar(criados, adminUnicoId, nomeRecepcao(cat), "Agenda e atende clientes, sem realizar procedimentos",
                Usuario.PerfilUsuario.PROFISSIONAL, PERM_RECEPCAO);
        criar(criados, adminUnicoId, nomeProfissional(cat), "Realiza os atendimentos e vê a própria agenda",
                Usuario.PerfilUsuario.PROFISSIONAL, PERM_PROFISSIONAL);

        log.info("Cargos padrão semeados para tenant {} (categoria {}): {}", adminUnicoId, cat, criados.size());
        return criados;
    }

    private void criar(List<Perfil> acc, Long adminUnicoId, String nome, String descricao,
                       Usuario.PerfilUsuario base, String permissoes) {
        if (perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(adminUnicoId, nome)) return;
        Perfil p = Perfil.builder()
                .nome(nome)
                .descricao(descricao)
                .adminUnicoId(adminUnicoId)
                .perfilSistemaBase(base)
                // sistema=false: é cargo DA empresa, ela pode renomear e excluir
                .sistema(false)
                .ativo(true)
                .atendente(base == Usuario.PerfilUsuario.PROFISSIONAL)
                .gerente(base == Usuario.PerfilUsuario.GERENTE)
                .cliente(false)
                .permissoesGranulares(permissoes)
                .build();
        acc.add(perfilRepository.save(p));
    }

    private String nomeGerente(CategoriaEmpresa cat) {
        return switch (cat) {
            case CONSULTORIO_MEDICO, CONSULTORIO_DENTARIO, FISIOTERAPIA, PSICOLOGIA, VETERINARIA -> "Coordenação";
            default -> "Gerente";
        };
    }

    private String nomeRecepcao(CategoriaEmpresa cat) {
        return switch (cat) {
            case CONSULTORIO_MEDICO, CONSULTORIO_DENTARIO, VETERINARIA -> "Secretária(o)";
            default -> "Recepção";
        };
    }

    private String nomeProfissional(CategoriaEmpresa cat) {
        return switch (cat) {
            case ACADEMIA -> "Personal Trainer";
            case CONSULTORIO_MEDICO -> "Médico(a)";
            case CONSULTORIO_DENTARIO -> "Dentista";
            case SALAO_BELEZA -> "Cabeleireiro(a)";
            case ESTETICA -> "Esteticista";
            case FISIOTERAPIA -> "Fisioterapeuta";
            case PSICOLOGIA -> "Psicólogo(a)";
            case NUTRICIONISTA -> "Nutricionista";
            case VETERINARIA -> "Veterinário(a)";
            case OUTROS -> "Profissional";
        };
    }
}
