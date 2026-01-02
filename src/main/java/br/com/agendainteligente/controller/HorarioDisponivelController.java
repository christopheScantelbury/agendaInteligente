package br.com.agendainteligente.controller;

import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Usuario;
import br.com.agendainteligente.dto.HorarioDisponivelDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.AtendenteRepository;
import br.com.agendainteligente.repository.UsuarioRepository;
import br.com.agendainteligente.service.HorarioDisponivelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/horarios-disponiveis")
@RequiredArgsConstructor
@Tag(name = "Horários Disponíveis", description = "API para gerenciamento de horários disponíveis por profissionais")
public class HorarioDisponivelController {

    private final HorarioDisponivelService horarioDisponivelService;
    private final AtendenteRepository atendenteRepository;
    private final UsuarioRepository usuarioRepository;

    @GetMapping("/meus-horarios")
    @PreAuthorize("hasRole('PROFISSIONAL')")
    @Operation(summary = "Listar horários disponíveis do profissional autenticado")
    public ResponseEntity<List<HorarioDisponivelDTO>> meusHorarios() {
        Long atendenteId = getAtendenteIdDoUsuarioAutenticado();
        return ResponseEntity.ok(horarioDisponivelService.listarPorAtendente(atendenteId));
    }

    @PostMapping
    @PreAuthorize("hasRole('PROFISSIONAL')")
    @Operation(summary = "Criar novo horário disponível")
    public ResponseEntity<HorarioDisponivelDTO> criar(@Valid @RequestBody HorarioDisponivelDTO horarioDTO) {
        Long atendenteId = getAtendenteIdDoUsuarioAutenticado();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(horarioDisponivelService.criar(horarioDTO, atendenteId));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar horário disponível")
    public ResponseEntity<HorarioDisponivelDTO> atualizar(@PathVariable Long id,
                                                           @Valid @RequestBody HorarioDisponivelDTO horarioDTO) {
        Long atendenteId = getAtendenteIdDoUsuarioAutenticado();
        return ResponseEntity.ok(horarioDisponivelService.atualizar(id, horarioDTO, atendenteId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Excluir horário disponível")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        Long atendenteId = getAtendenteIdDoUsuarioAutenticado();
        horarioDisponivelService.excluir(id, atendenteId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/buscar")
    @Operation(summary = "Buscar horários disponíveis por unidade, serviço e período")
    public ResponseEntity<List<HorarioDisponivelDTO>> buscarHorariosDisponiveis(
            @RequestParam Long unidadeId,
            @RequestParam Long servicoId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        
        List<HorarioDisponivelDTO> horarios = horarioDisponivelService.buscarHorariosDisponiveis(
                unidadeId, servicoId, dataInicio, dataFim);
        
        return ResponseEntity.ok(horarios);
    }

    private Long getAtendenteIdDoUsuarioAutenticado() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado"));
        
        Atendente atendente = atendenteRepository.findByUsuarioId(usuario.getId())
                .orElseThrow(() -> new BusinessException("Usuário não está vinculado a um atendente"));
        
        return atendente.getId();
    }
}

