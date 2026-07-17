package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PerfilMapper;
import br.com.agendainteligente.repository.PerfilRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.test.TestSecurityContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PerfilServiceTest {

    @Mock
    private PerfilRepository perfilRepository;

    @Mock
    private PerfilMapper perfilMapper;

    @Mock
    private UsuarioRepository usuarioRepository;

    @InjectMocks
    private PerfilService perfilService;

    private static final Long TENANT_ID = 99L;

    private Perfil perfil;
    private PerfilDTO perfilDTO;
    private Usuario usuarioLogado;

    @BeforeEach
    void setUp() {
        // #171: PerfilService escopa por tenant — o service resolve o Usuario
        // pelo e-mail do SecurityContext, então o mock precisa devolvê-lo.
        TestSecurityContext.authenticateAs("admin@test.com", "ROLE_ADMIN");
        usuarioLogado = Usuario.builder()
                .id(TENANT_ID)
                .email("admin@test.com")
                .perfilSistema(Usuario.PerfilUsuario.ADMINISTRADOR)
                .build();
        when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(usuarioLogado));

        perfil = Perfil.builder()
                .id(1L)
                .nome("VENDEDOR")
                .descricao("Perfil de vendedor")
                .adminUnicoId(TENANT_ID)
                .perfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL)
                .sistema(false)
                .ativo(true)
                .permissoesMenu("[\"/\", \"/clientes\", \"/vendas\"]")
                .build();

        perfilDTO = PerfilDTO.builder()
                .id(1L)
                .nome("VENDEDOR")
                .descricao("Perfil de vendedor")
                .perfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL)
                .sistema(false)
                .ativo(true)
                .permissoesMenu(Arrays.asList("/", "/clientes", "/vendas"))
                .build();
    }

    @AfterEach
    void tearDown() {
        TestSecurityContext.clear();
    }

    @Test
    void testListarTodos() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findVisiveisPorTenant(TENANT_ID)).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarTodos();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("VENDEDOR", result.get(0).getNome());
        // #171 SEC: nunca findAll() — vazaria cargos de outros tenants
        verify(perfilRepository, never()).findAll();
        verify(perfilRepository, times(1)).findVisiveisPorTenant(TENANT_ID);
    }

    @Test
    void testListarAtivos() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findVisiveisPorTenant(TENANT_ID)).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarAtivos();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(perfilRepository, never()).findByAtivoTrue();
        verify(perfilRepository, times(1)).findVisiveisPorTenant(TENANT_ID);
    }

    @Test
    void testListarCustomizados() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findByAdminUnicoIdAndAtivoTrueOrderByNomeAsc(TENANT_ID)).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarCustomizados();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(perfilRepository, never()).findBySistemaFalse();
        verify(perfilRepository, times(1)).findByAdminUnicoIdAndAtivoTrueOrderByNomeAsc(TENANT_ID);
    }

    @Test
    void testBuscarPorId_Sucesso() {
        // Arrange
        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        when(perfilMapper.toDTO(perfil)).thenReturn(perfilDTO);

        // Act
        PerfilDTO result = perfilService.buscarPorId(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("VENDEDOR", result.getNome());
        verify(perfilRepository, times(1)).findById(1L);
    }

    @Test
    void testBuscarPorId_NaoEncontrado() {
        // Arrange
        when(perfilRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> perfilService.buscarPorId(1L));
        verify(perfilRepository, times(1)).findById(1L);
    }

    @Test
    void testBuscarPorNome_Sucesso() {
        // Arrange
        when(perfilRepository.findByNome("VENDEDOR")).thenReturn(Optional.of(perfil));
        when(perfilMapper.toDTO(perfil)).thenReturn(perfilDTO);

        // Act
        PerfilDTO result = perfilService.buscarPorNome("VENDEDOR");

        // Assert
        assertNotNull(result);
        assertEquals("VENDEDOR", result.getNome());
        verify(perfilRepository, times(1)).findByNome("VENDEDOR");
    }

    @Test
    void testBuscarPorNome_NaoEncontrado() {
        // Arrange
        when(perfilRepository.findByNome("INEXISTENTE")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> perfilService.buscarPorNome("INEXISTENTE"));
        verify(perfilRepository, times(1)).findByNome("INEXISTENTE");
    }

    @Test
    void testCriar_Sucesso() {
        // Arrange
        PerfilDTO dtoCriacao = PerfilDTO.builder()
                .nome("NOVO_PERFIL")
                .descricao("Novo perfil customizado")
                .permissoesMenu(Arrays.asList("/", "/dashboard"))
                .build();

        Perfil perfilSalvo = Perfil.builder()
                .id(2L)
                .nome("NOVO_PERFIL")
                .descricao("Novo perfil customizado")
                .sistema(false)
                .ativo(true)
                .build();

        when(perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(TENANT_ID, "NOVO_PERFIL")).thenReturn(false);
        when(perfilMapper.toEntity(any(PerfilDTO.class))).thenReturn(perfilSalvo);
        when(perfilRepository.save(any(Perfil.class))).thenReturn(perfilSalvo);
        when(perfilMapper.toDTO(perfilSalvo)).thenReturn(dtoCriacao);

        // Act
        PerfilDTO result = perfilService.criar(dtoCriacao);

        // Assert
        assertNotNull(result);
        assertFalse(result.getSistema()); // Deve ser false para perfis customizados
        verify(perfilRepository, times(1)).existsByAdminUnicoIdAndNomeIgnoreCase(TENANT_ID, "NOVO_PERFIL");
        verify(perfilRepository, times(1)).save(any(Perfil.class));
    }

    @Test
    void testCriar_NomeDuplicado() {
        // Arrange
        PerfilDTO dtoCriacao = PerfilDTO.builder()
                .nome("VENDEDOR")
                .build();

        when(perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(TENANT_ID, "VENDEDOR")).thenReturn(true);

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.criar(dtoCriacao));
        verify(perfilRepository, times(1)).existsByAdminUnicoIdAndNomeIgnoreCase(TENANT_ID, "VENDEDOR");
        verify(perfilRepository, never()).save(any(Perfil.class));
    }

    @Test
    void testAtualizar_Sucesso() {
        // Arrange
        PerfilDTO dtoAtualizacao = PerfilDTO.builder()
                .nome("VENDEDOR")
                .descricao("Descrição atualizada")
                .permissoesMenu(Arrays.asList("/", "/clientes"))
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        when(perfilRepository.existsByNome("VENDEDOR")).thenReturn(true); // Mesmo nome
        when(perfilRepository.save(any(Perfil.class))).thenReturn(perfil);
        when(perfilMapper.toDTO(perfil)).thenReturn(dtoAtualizacao);

        // Act
        PerfilDTO result = perfilService.atualizar(1L, dtoAtualizacao);

        // Assert
        assertNotNull(result);
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, times(1)).save(any(Perfil.class));
    }

    @Test
    void testAtualizar_PerfilDoSistema() {
        // Perfil do sistema permite apenas atualizar permissões — nome/descricao são ignorados.
        Perfil perfilSistema = Perfil.builder()
                .id(1L)
                .nome("ADMIN")
                .sistema(true)
                .build();

        PerfilDTO dtoAtualizacao = PerfilDTO.builder()
                .nome("ADMIN")
                .descricao("Tentativa de editar")
                .permissoesMenu(Arrays.asList("/dashboard"))
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfilSistema));
        when(perfilRepository.save(any(Perfil.class))).thenReturn(perfilSistema);
        when(perfilMapper.toDTO(perfilSistema)).thenReturn(perfilDTO);

        // Act — não deve lançar; deve atualizar apenas as permissões e devolver DTO
        PerfilDTO result = perfilService.atualizar(1L, dtoAtualizacao);

        // Assert
        assertNotNull(result);
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, times(1)).save(any(Perfil.class));
    }

    @Test
    void testAtualizar_NomeDuplicado() {
        // Arrange
        PerfilDTO dtoAtualizacao = PerfilDTO.builder()
                .nome("OUTRO_PERFIL")
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        // #171: unicidade é por tenant, não global
        when(perfilRepository.existsByAdminUnicoIdAndNomeIgnoreCase(TENANT_ID, "OUTRO_PERFIL")).thenReturn(true);

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.atualizar(1L, dtoAtualizacao));
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, never()).save(any(Perfil.class));
    }

    @Test
    void testExcluir_Sucesso() {
        // Arrange
        perfil.setUsuarios(null); // Sem usuários vinculados
        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        doNothing().when(perfilRepository).delete(perfil);

        // Act
        perfilService.excluir(1L);

        // Assert
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, times(1)).delete(perfil);
    }

    @Test
    void testExcluir_PerfilDoSistema() {
        // Arrange
        Perfil perfilSistema = Perfil.builder()
                .id(1L)
                .nome("ADMIN")
                .sistema(true)
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfilSistema));

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.excluir(1L));
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, never()).delete(any(Perfil.class));
    }

    @Test
    void testExcluir_ComUsuariosVinculados() {
        // Arrange — perfil com lista de usuários não-vazia deve recusar exclusão
        perfil.setUsuarios(Arrays.asList(
                br.com.agendainteligente.domain.entity.Usuario.builder().id(1L).build()
        ));
        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.excluir(1L));
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, never()).delete(any(Perfil.class));
    }

    // ── #171 SEC ────────────────────────────────────────────────────────────

    @Test
    void buscarPorId_cargoDeOutroTenant_naoVaza() {
        // Cargo pertencente a OUTRA empresa
        Perfil deOutroTenant = Perfil.builder()
                .id(50L)
                .nome("Cabeleireiro(a)")
                .adminUnicoId(TENANT_ID + 1)
                .perfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL)
                .sistema(false)
                .ativo(true)
                .build();
        when(perfilRepository.findById(50L)).thenReturn(Optional.of(deOutroTenant));

        // 404 em vez de 403: não revela que o recurso existe
        assertThrows(ResourceNotFoundException.class, () -> perfilService.buscarPorId(50L));
    }

    @Test
    void excluir_cargoDeOutroTenant_naoApaga() {
        Perfil deOutroTenant = Perfil.builder()
                .id(51L)
                .nome("Recepção")
                .adminUnicoId(TENANT_ID + 1)
                .perfilSistemaBase(Usuario.PerfilUsuario.PROFISSIONAL)
                .sistema(false)
                .ativo(true)
                .build();
        when(perfilRepository.findById(51L)).thenReturn(Optional.of(deOutroTenant));

        assertThrows(ResourceNotFoundException.class, () -> perfilService.excluir(51L));
        verify(perfilRepository, never()).delete(any(Perfil.class));
        verify(perfilRepository, never()).deleteById(anyLong());
    }

    @Test
    void criar_cargoComBaseAdmin_bloqueiaEscalada() {
        // ADMINISTRADOR tentando fabricar um cargo com poder de ADMIN da plataforma
        PerfilDTO escalada = PerfilDTO.builder()
                .nome("SuperUser")
                .perfilSistemaBase(Usuario.PerfilUsuario.ADMIN)
                .build();

        assertThrows(BusinessException.class, () -> perfilService.criar(escalada));
        verify(perfilRepository, never()).save(any(Perfil.class));
    }
}
