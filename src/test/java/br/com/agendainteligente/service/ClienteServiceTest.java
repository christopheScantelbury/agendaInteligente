package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ClienteMapper;
import br.com.agendainteligente.mapper.ClienteMapperImpl;
import br.com.agendainteligente.mapper.UnidadeMapper;
import br.com.agendainteligente.repository.ClienteRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private UnidadeMapper unidadeMapper;

    @Spy
    private ClienteMapper clienteMapper = new ClienteMapperImpl();

    @InjectMocks
    private ClienteService clienteService;

    private Cliente cliente;
    private ClienteDTO clienteDTO;

    private Unidade unidade;

    @BeforeEach
    void setUp() {
        unidade = Unidade.builder()
                .id(1L)
                .nome("Unidade Teste")
                .ativo(true)
                .build();

        cliente = Cliente.builder()
                .id(1L)
                .nome("João Silva")
                .cpfCnpj("12345678900")
                .email("joao@test.com")
                .telefone("11999999999")
                .unidade(unidade)
                .build();

        clienteDTO = ClienteDTO.builder()
                .id(1L)
                .nome("João Silva")
                .cpfCnpj("12345678900")
                .email("joao@test.com")
                .telefone("11999999999")
                .unidadeId(1L)
                .build();
    }

    @Test
    void deveListarTodosOsClientes() {
        // Arrange
        List<Cliente> clientes = Arrays.asList(cliente);
        when(clienteRepository.findAll()).thenReturn(clientes);

        // Act
        List<ClienteDTO> result = clienteService.listarTodos();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("João Silva", result.get(0).getNome());
        verify(clienteRepository).findAll();
    }

    @Test
    void deveBuscarClientePorId() {
        // Arrange
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));

        // Act
        ClienteDTO result = clienteService.buscarPorId(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("João Silva", result.getNome());
        verify(clienteRepository).findById(1L);
    }

    @Test
    void deveLancarExcecaoQuandoClienteNaoEncontrado() {
        // Arrange
        when(clienteRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            clienteService.buscarPorId(1L);
        });

        assertEquals("Cliente não encontrado com id: 1", exception.getMessage());
        verify(clienteRepository).findById(1L);
    }

    @Test
    void deveCriarClienteComSucesso() {
        // Arrange
        clienteDTO.setId(null);
        when(clienteRepository.existsByCpfCnpj("12345678900")).thenReturn(false);
        when(usuarioRepository.existsByEmail("joao@test.com")).thenReturn(false);
        when(unidadeRepository.findById(1L)).thenReturn(Optional.of(unidade));
        when(clienteRepository.save(any(Cliente.class))).thenReturn(cliente);

        // Act
        ClienteDTO result = clienteService.criar(clienteDTO);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("João Silva", result.getNome());
        verify(clienteRepository).existsByCpfCnpj("12345678900");
        verify(usuarioRepository).existsByEmail("joao@test.com");
        verify(unidadeRepository).findById(1L);
        verify(clienteRepository).save(any(Cliente.class));
    }

    @Test
    void deveLancarExcecaoQuandoCpfCnpjJaExiste() {
        // Arrange
        when(clienteRepository.existsByCpfCnpj("12345678900")).thenReturn(true);

        // Act & Assert
        BusinessException exception = assertThrows(BusinessException.class, () -> {
            clienteService.criar(clienteDTO);
        });

        assertEquals("Já existe um cliente cadastrado com este CPF/CNPJ", exception.getMessage());
        verify(clienteRepository).existsByCpfCnpj("12345678900");
        verify(clienteRepository, never()).save(any());
    }

    @Test
    void deveAtualizarClienteComSucesso() {
        // Arrange
        ClienteDTO clienteAtualizado = ClienteDTO.builder()
                .id(1L)
                .nome("João Silva Atualizado")
                .cpfCnpj("12345678900")
                .email("joao.novo@test.com")
                .telefone("11988888888")
                .build();

        when(clienteRepository.findById(1L)).thenReturn(Optional.of(cliente));
        when(clienteRepository.save(any(Cliente.class))).thenReturn(cliente);

        // Act
        ClienteDTO result = clienteService.atualizar(1L, clienteAtualizado);

        // Assert
        assertNotNull(result);
        verify(clienteRepository).findById(1L);
        verify(clienteRepository).save(any(Cliente.class));
    }

    @Test
    void deveExcluirClienteComSucesso() {
        // Arrange
        when(clienteRepository.existsById(1L)).thenReturn(true);
        doNothing().when(clienteRepository).deleteById(1L);

        // Act
        clienteService.excluir(1L);

        // Assert
        verify(clienteRepository).existsById(1L);
        verify(clienteRepository).deleteById(1L);
    }

    @Test
    void deveLancarExcecaoAoExcluirClienteInexistente() {
        // Arrange
        when(clienteRepository.existsById(1L)).thenReturn(false);

        // Act & Assert
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> {
            clienteService.excluir(1L);
        });

        assertEquals("Cliente não encontrado com id: 1", exception.getMessage());
        verify(clienteRepository).existsById(1L);
        verify(clienteRepository, never()).deleteById(any());
    }
}

