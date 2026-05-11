package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Empresa;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.domain.entity.Usuario.PerfilUsuario;
import br.com.agendainteligente.domain.enums.CategoriaEmpresa;
import br.com.agendainteligente.dto.EmpresaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.EmpresaMapper;
import br.com.agendainteligente.repository.EmpresaRepository;
import br.com.agendainteligente.repository.UnidadeRepository;
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
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class EmpresaServiceTest {

    @Mock
    private EmpresaRepository empresaRepository;

    @Mock
    private EmpresaMapper empresaMapper;

    @Mock
    private ImageCompressionService imageCompressionService;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private UnidadeRepository unidadeRepository;

    @InjectMocks
    private EmpresaService empresaService;

    private Empresa empresa;
    private EmpresaDTO empresaDTO;
    private Usuario admin;

    @BeforeEach
    void setUp() {
        // Autenticar como ADMIN com usuário existente
        TestSecurityContext.authenticateAs("admin@test.com", "ROLE_ADMIN");
        admin = Usuario.builder()
                .id(99L)
                .email("admin@test.com")
                .nome("Admin")
                .perfilSistema(PerfilUsuario.ADMIN)
                .ativo(true)
                .build();
        when(usuarioRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));

        empresa = Empresa.builder()
                .id(1L)
                .nome("Empresa Teste")
                .razaoSocial("Empresa Teste LTDA")
                .cnpj("12345678000190")
                .email("teste@empresa.com")
                .telefone("(92) 3234-5678")
                .ativo(true)
                .build();

        empresaDTO = EmpresaDTO.builder()
                .id(1L)
                .nome("Empresa Teste")
                .razaoSocial("Empresa Teste LTDA")
                .cnpj("12345678000190")
                .email("teste@empresa.com")
                .telefone("(92) 3234-5678")
                .ativo(true)
                .build();
    }

    @AfterEach
    void tearDown() {
        TestSecurityContext.clear();
    }

    @Test
    void testListarTodas() {
        // Arrange
        List<Empresa> empresas = Arrays.asList(empresa);
        when(empresaRepository.findAll()).thenReturn(empresas);
        when(empresaMapper.toDTO(any(Empresa.class))).thenReturn(empresaDTO);

        // Act
        List<EmpresaDTO> result = empresaService.listarTodas();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Empresa Teste", result.get(0).getNome());
        verify(empresaRepository, times(1)).findAll();
    }

    @Test
    void testListarAtivas() {
        // Arrange
        List<Empresa> empresas = Arrays.asList(empresa);
        when(empresaRepository.findByAtivoTrue()).thenReturn(empresas);
        when(empresaMapper.toDTO(any(Empresa.class))).thenReturn(empresaDTO);

        // Act
        List<EmpresaDTO> result = empresaService.listarAtivas();

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(empresaRepository, times(1)).findByAtivoTrue();
    }

    @Test
    void testBuscarPorId_Sucesso() {
        // Arrange
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(empresaMapper.toDTO(empresa)).thenReturn(empresaDTO);

        // Act
        EmpresaDTO result = empresaService.buscarPorId(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("Empresa Teste", result.getNome());
        verify(empresaRepository, times(1)).findById(1L);
    }

    @Test
    void testCriar_ComCategoria_PreservaCategoriaInformada() {
        EmpresaDTO dto = EmpresaDTO.builder()
                .nome("Clínica X")
                .categoria(CategoriaEmpresa.CONSULTORIO_MEDICO)
                .build();
        Empresa entityComCategoria = Empresa.builder()
                .id(5L)
                .nome("Clínica X")
                .categoria(CategoriaEmpresa.CONSULTORIO_MEDICO)
                .build();

        when(empresaMapper.toEntity(dto)).thenReturn(entityComCategoria);
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(i -> i.getArgument(0));
        when(empresaMapper.toDTO(any(Empresa.class))).thenReturn(dto);

        EmpresaDTO result = empresaService.criar(dto);

        assertEquals(CategoriaEmpresa.CONSULTORIO_MEDICO, result.getCategoria());
        verify(empresaRepository).save(argThat(e ->
                e.getCategoria() == CategoriaEmpresa.CONSULTORIO_MEDICO));
    }

    @Test
    void testEmpresa_categoriaDefaultEhOUTROS() {
        // Builder.Default deve aplicar OUTROS quando categoria não é informada
        Empresa nova = Empresa.builder().nome("Sem categoria").build();
        assertEquals(CategoriaEmpresa.OUTROS, nova.getCategoria());
    }

    @Test
    void testBuscarPorId_NaoEncontrado() {
        // Arrange
        when(empresaRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> empresaService.buscarPorId(1L));
        verify(empresaRepository, times(1)).findById(1L);
    }

    @Test
    void testCriar_Sucesso() {
        // Arrange
        EmpresaDTO dtoCriacao = EmpresaDTO.builder()
                .nome("Nova Empresa")
                .cnpj("98765432000100")
                .build();

        Empresa empresaSalva = Empresa.builder()
                .id(2L)
                .nome("Nova Empresa")
                .cnpj("98765432000100")
                .build();

        when(empresaRepository.existsByCnpj("98765432000100")).thenReturn(false);
        when(empresaMapper.toEntity(dtoCriacao)).thenReturn(empresaSalva);
        when(empresaRepository.save(any(Empresa.class))).thenReturn(empresaSalva);
        when(empresaMapper.toDTO(empresaSalva)).thenReturn(dtoCriacao);

        // Act
        EmpresaDTO result = empresaService.criar(dtoCriacao);

        // Assert
        assertNotNull(result);
        verify(empresaRepository, times(1)).existsByCnpj("98765432000100");
        verify(empresaRepository, times(1)).save(any(Empresa.class));
    }

    @Test
    void testCriar_CnpjDuplicado() {
        // Arrange
        EmpresaDTO dtoCriacao = EmpresaDTO.builder()
                .nome("Nova Empresa")
                .cnpj("12345678000190")
                .build();

        when(empresaRepository.existsByCnpj("12345678000190")).thenReturn(true);

        // Act & Assert
        assertThrows(BusinessException.class, () -> empresaService.criar(dtoCriacao));
        verify(empresaRepository, times(1)).existsByCnpj("12345678000190");
        verify(empresaRepository, never()).save(any(Empresa.class));
    }

    @Test
    void testCriar_ComLogo() {
        // Arrange
        String logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        String logoComprimida = "data:image/jpeg;base64,compressed";
        
        EmpresaDTO dtoCriacao = EmpresaDTO.builder()
                .nome("Nova Empresa")
                .logo(logoBase64)
                .build();

        Empresa empresaSalva = Empresa.builder()
                .id(2L)
                .nome("Nova Empresa")
                .logo(logoComprimida)
                .build();

        when(empresaRepository.existsByCnpj(null)).thenReturn(false);
        when(imageCompressionService.compressImage(logoBase64)).thenReturn(logoComprimida);
        when(empresaMapper.toEntity(any(EmpresaDTO.class))).thenReturn(empresaSalva);
        when(empresaRepository.save(any(Empresa.class))).thenReturn(empresaSalva);
        when(empresaMapper.toDTO(empresaSalva)).thenReturn(dtoCriacao);

        // Act
        EmpresaDTO result = empresaService.criar(dtoCriacao);

        // Assert
        assertNotNull(result);
        verify(imageCompressionService, times(1)).compressImage(logoBase64);
        verify(empresaRepository, times(1)).save(any(Empresa.class));
    }

    @Test
    void testAtualizar_Sucesso() {
        // Arrange
        EmpresaDTO dtoAtualizacao = EmpresaDTO.builder()
                .nome("Empresa Atualizada")
                .cnpj("12345678000190")
                .build();

        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(empresaRepository.findByCnpj("12345678000190")).thenReturn(Optional.of(empresa));
        when(empresaRepository.save(any(Empresa.class))).thenReturn(empresa);
        when(empresaMapper.toDTO(empresa)).thenReturn(dtoAtualizacao);

        // Act
        EmpresaDTO result = empresaService.atualizar(1L, dtoAtualizacao);

        // Assert
        assertNotNull(result);
        verify(empresaRepository, times(1)).findById(1L);
        verify(empresaRepository, times(1)).save(any(Empresa.class));
    }

    @Test
    void testAtualizar_NaoEncontrado() {
        // Arrange
        EmpresaDTO dtoAtualizacao = EmpresaDTO.builder()
                .nome("Empresa Atualizada")
                .build();

        when(empresaRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(ResourceNotFoundException.class, () -> empresaService.atualizar(1L, dtoAtualizacao));
        verify(empresaRepository, times(1)).findById(1L);
        verify(empresaRepository, never()).save(any(Empresa.class));
    }

    @Test
    void testExcluir_Sucesso() {
        // Arrange
        empresa.setUnidades(null); // Sem unidades vinculadas
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        doNothing().when(empresaRepository).delete(empresa);

        // Act
        empresaService.excluir(1L);

        // Assert
        verify(empresaRepository, times(1)).findById(1L);
        verify(empresaRepository, times(1)).delete(empresa);
    }

    @Test
    void testExcluir_ComUnidadesVinculadas() {
        // Arrange — empresa com unidades vinculadas deve recusar exclusão
        empresa.setUnidades(Arrays.asList(
                br.com.agendainteligente.domain.entity.Unidade.builder().id(1L).build()
        ));
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));

        // Act & Assert
        assertThrows(BusinessException.class, () -> empresaService.excluir(1L));
        verify(empresaRepository, times(1)).findById(1L);
        verify(empresaRepository, never()).delete(any(Empresa.class));
    }

    @Test
    void testValidarCorApp() {
        // Arrange
        EmpresaDTO dto = EmpresaDTO.builder()
                .nome("Empresa")
                .corApp("#FF5733")
                .build();

        Empresa empresaSalva = Empresa.builder()
                .id(1L)
                .nome("Empresa")
                .corApp("#FF5733")
                .build();

        when(empresaRepository.existsByCnpj(null)).thenReturn(false);
        when(empresaMapper.toEntity(any(EmpresaDTO.class))).thenReturn(empresaSalva);
        when(empresaRepository.save(any(Empresa.class))).thenReturn(empresaSalva);
        when(empresaMapper.toDTO(empresaSalva)).thenReturn(dto);

        // Act
        EmpresaDTO result = empresaService.criar(dto);

        // Assert
        assertNotNull(result);
        verify(empresaRepository, times(1)).save(any(Empresa.class));
    }
}
