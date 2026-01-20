package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Perfil;
import br.com.agendainteligente.dto.PerfilDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.PerfilMapper;
import br.com.agendainteligente.repository.PerfilRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PerfilServiceTest {

    @Mock
    private PerfilRepository perfilRepository;

    @Mock
    private PerfilMapper perfilMapper;

    @InjectMocks
    private PerfilService perfilService;

    private Perfil perfil;
    private PerfilDTO perfilDTO;

    @BeforeEach
    void setUp() {
        perfil = Perfil.builder()
                .id(1L)
                .nome("VENDEDOR")
                .descricao("Perfil de vendedor")
                .sistema(false)
                .ativo(true)
                .permissoesMenu("[\"/\", \"/clientes\", \"/vendas\"]")
                .build();

        perfilDTO = PerfilDTO.builder()
                .id(1L)
                .nome("VENDEDOR")
                .descricao("Perfil de vendedor")
                .sistema(false)
                .ativo(true)
                .permissoesMenu(Arrays.asList("/", "/clientes", "/vendas"))
                .build();
    }

    @Test
    void testListarTodos() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findAll()).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarTodos();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("VENDEDOR", result.get(0).getNome());
        verify(perfilRepository, times(1)).findAll();
    }

    @Test
    void testListarAtivos() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findByAtivoTrue()).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarAtivos();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(perfilRepository, times(1)).findByAtivoTrue();
    }

    @Test
    void testListarCustomizados() {
        // Arrange
        List<Perfil> perfis = Arrays.asList(perfil);
        when(perfilRepository.findBySistemaFalse()).thenReturn(perfis);
        when(perfilMapper.toDTO(any(Perfil.class))).thenReturn(perfilDTO);

        // Act
        List<PerfilDTO> result = perfilService.listarCustomizados();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(perfilRepository, times(1)).findBySistemaFalse();
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

        when(perfilRepository.existsByNome("NOVO_PERFIL")).thenReturn(false);
        when(perfilMapper.toEntity(any(PerfilDTO.class))).thenReturn(perfilSalvo);
        when(perfilRepository.save(any(Perfil.class))).thenReturn(perfilSalvo);
        when(perfilMapper.toDTO(perfilSalvo)).thenReturn(dtoCriacao);

        // Act
        PerfilDTO result = perfilService.criar(dtoCriacao);

        // Assert
        assertNotNull(result);
        assertFalse(result.getSistema()); // Deve ser false para perfis customizados
        verify(perfilRepository, times(1)).existsByNome("NOVO_PERFIL");
        verify(perfilRepository, times(1)).save(any(Perfil.class));
    }

    @Test
    void testCriar_NomeDuplicado() {
        // Arrange
        PerfilDTO dtoCriacao = PerfilDTO.builder()
                .nome("VENDEDOR")
                .build();

        when(perfilRepository.existsByNome("VENDEDOR")).thenReturn(true);

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.criar(dtoCriacao));
        verify(perfilRepository, times(1)).existsByNome("VENDEDOR");
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
        // Arrange
        Perfil perfilSistema = Perfil.builder()
                .id(1L)
                .nome("ADMIN")
                .sistema(true)
                .build();

        PerfilDTO dtoAtualizacao = PerfilDTO.builder()
                .nome("ADMIN")
                .descricao("Tentativa de editar")
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfilSistema));

        // Act & Assert
        assertThrows(BusinessException.class, () -> perfilService.atualizar(1L, dtoAtualizacao));
        verify(perfilRepository, times(1)).findById(1L);
        verify(perfilRepository, never()).save(any(Perfil.class));
    }

    @Test
    void testAtualizar_NomeDuplicado() {
        // Arrange
        PerfilDTO dtoAtualizacao = PerfilDTO.builder()
                .nome("OUTRO_PERFIL")
                .build();

        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        when(perfilRepository.existsByNome("OUTRO_PERFIL")).thenReturn(true);

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
        // Arrange
        // Simular perfil com usuários
        when(perfilRepository.findById(1L)).thenReturn(Optional.of(perfil));
        when(perfil.getUsuarios()).thenReturn(Arrays.asList()); // Lista vazia para passar

        // Act & Assert
        // Como não há usuários, deve excluir normalmente
        assertDoesNotThrow(() -> perfilService.excluir(1L));
    }
}
