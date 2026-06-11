package br.com.agendainteligente.controller;

import br.com.agendainteligente.dto.EmpresaDTO;
import br.com.agendainteligente.dto.EmpresaEstatisticasDTO;
import br.com.agendainteligente.service.EmpresaEstatisticasService;
import br.com.agendainteligente.service.EmpresaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empresas")
@RequiredArgsConstructor
@Tag(name = "Empresas", description = "API para gerenciamento de empresas")
public class EmpresaController {

    private final EmpresaService empresaService;
    private final EmpresaEstatisticasService empresaEstatisticasService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Listar todas as empresas")
    public ResponseEntity<List<EmpresaDTO>> listarTodas() {
        return ResponseEntity.ok(empresaService.listarTodas());
    }

    @GetMapping("/ativas")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Listar apenas empresas ativas")
    public ResponseEntity<List<EmpresaDTO>> listarAtivas() {
        return ResponseEntity.ok(empresaService.listarAtivas());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('GERENTE')")
    @Operation(summary = "Buscar empresa por ID")
    public ResponseEntity<EmpresaDTO> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(empresaService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Criar nova empresa")
    public ResponseEntity<EmpresaDTO> criar(@Valid @RequestBody EmpresaDTO empresaDTO) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(empresaService.criar(empresaDTO));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Atualizar empresa")
    public ResponseEntity<EmpresaDTO> atualizar(@PathVariable Long id,
                                                 @Valid @RequestBody EmpresaDTO empresaDTO) {
        return ResponseEntity.ok(empresaService.atualizar(id, empresaDTO));
    }

    /** #158: KPIs do modal Editar Empresa. ADMIN qualquer; ADMINISTRADOR a própria. */
    @GetMapping("/{id}/estatisticas")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Estatísticas resumidas da empresa")
    public ResponseEntity<EmpresaEstatisticasDTO> estatisticas(@PathVariable Long id) {
        return ResponseEntity.ok(empresaEstatisticasService.estatisticas(id));
    }

    /** #158: troca de plano — só ADMIN global (service revalida o perfil). */
    @PostMapping("/{id}/plano")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') and !hasAuthority('ROLE_ADMINISTRADOR')")
    @Operation(summary = "Trocar plano comercial da empresa")
    public ResponseEntity<EmpresaDTO> trocarPlano(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Long> body) {
        Long planoId = body.get("planoId");
        return ResponseEntity.ok(empresaService.trocarPlano(id, planoId));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Excluir empresa")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        empresaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
