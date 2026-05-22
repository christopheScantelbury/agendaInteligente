package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.ClienteDuplicataDTO;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.dto.ClienteResumoDTO;
import br.com.agendainteligente.dto.ClienteRetornoDTO;
import br.com.agendainteligente.dto.ClienteSumidoDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ClienteMapper;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.ClienteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClienteInsightsService {

    private final AgendamentoRepository agendamentoRepository;
    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;

    @Transactional(readOnly = true)
    public List<ClienteRetornoDTO> buscarRetornos(Long unidadeId, Long servicoId, int diasLimite) {
        log.debug("Buscando retornos: unidade={}, servico={}, diasLimite={}", unidadeId, servicoId, diasLimite);

        List<Object[]> rows = agendamentoRepository.findUltimoAtendimentoPorServico(unidadeId, servicoId);

        LocalDateTime agora = LocalDateTime.now();

        return rows.stream()
                .map(row -> {
                    Long clienteId = ((Number) row[0]).longValue();
                    String clienteNome = (String) row[1];
                    String clienteTelefone = (String) row[2];
                    LocalDateTime ultimoAtendimento = toLocalDateTime(row[3]);
                    Long totalAtendimentos = ((Number) row[4]).longValue();

                    LocalDateTime dataRetorno = ultimoAtendimento.plusDays(diasLimite);
                    long diasParaRetorno = ChronoUnit.DAYS.between(agora, dataRetorno);

                    return ClienteRetornoDTO.builder()
                            .clienteId(clienteId)
                            .clienteNome(clienteNome)
                            .clienteTelefone(clienteTelefone)
                            .ultimoAtendimento(ultimoAtendimento)
                            .dataRetorno(dataRetorno)
                            .diasParaRetorno(diasParaRetorno)
                            .totalAtendimentos(totalAtendimentos)
                            .build();
                })
                .sorted(Comparator.comparingLong(ClienteRetornoDTO::getDiasParaRetorno))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ClienteSumidoDTO> buscarSumidos(Long unidadeId, int diasSemRetorno, int minAtendimentos) {
        log.debug("Buscando sumidos: unidade={}, diasSemRetorno={}, minAtendimentos={}", unidadeId, diasSemRetorno, minAtendimentos);

        List<Object[]> rows = agendamentoRepository.findClientesSumidos(unidadeId, diasSemRetorno, minAtendimentos);

        LocalDateTime agora = LocalDateTime.now();

        return rows.stream()
                .map(row -> {
                    Long clienteId = ((Number) row[0]).longValue();
                    String clienteNome = (String) row[1];
                    String clienteTelefone = (String) row[2];
                    LocalDateTime ultimoAtendimento = toLocalDateTime(row[3]);
                    Long totalAtendimentos = ((Number) row[4]).longValue();

                    long dias = ChronoUnit.DAYS.between(ultimoAtendimento, agora);

                    return ClienteSumidoDTO.builder()
                            .clienteId(clienteId)
                            .clienteNome(clienteNome)
                            .clienteTelefone(clienteTelefone)
                            .ultimoAtendimento(ultimoAtendimento)
                            .diasSemRetorno(dias)
                            .totalAtendimentos(totalAtendimentos)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClienteResumoDTO buscarResumo(Long clienteId) {
        log.debug("Buscando resumo do cliente id={}", clienteId);

        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + clienteId));

        List<Agendamento> agendamentos = agendamentoRepository.findByClienteIdWithServicos(clienteId);

        LocalDateTime ultimoAtendimento = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO)
                .map(Agendamento::getDataHoraInicio)
                .max(Comparator.naturalOrder())
                .orElse(null);

        long diasDesdeUltimo = ultimoAtendimento != null
                ? ChronoUnit.DAYS.between(ultimoAtendimento, LocalDateTime.now())
                : -1;

        List<ClienteResumoDTO.ProcedimentoResumo> ultimosProcedimentos = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CONCLUIDO && a.getServicos() != null)
                .sorted(Comparator.comparing(Agendamento::getDataHoraInicio).reversed())
                .limit(5)
                .flatMap(a -> a.getServicos().stream()
                        .map(as -> ClienteResumoDTO.ProcedimentoResumo.builder()
                                .nome(as.getServico() != null ? as.getServico().getNome() : "")
                                .data(a.getDataHoraInicio())
                                .build()))
                .collect(Collectors.toList());

        long totalCancelamentos = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.CANCELADO)
                .count();

        long totalNaoCompareceu = agendamentos.stream()
                .filter(a -> a.getStatus() == StatusAgendamento.NO_SHOW)
                .count();

        return ClienteResumoDTO.builder()
                .id(cliente.getId())
                .nome(cliente.getNome())
                .telefone(cliente.getTelefone())
                .email(cliente.getEmail())
                .cpfCnpj(cliente.getCpfCnpj())
                .dataNascimento(cliente.getDataNascimento())
                .ultimoAtendimento(ultimoAtendimento)
                .diasDesdeUltimoAtendimento(diasDesdeUltimo >= 0 ? diasDesdeUltimo : null)
                .ultimosProcedimentos(ultimosProcedimentos)
                .totalCancelamentos(totalCancelamentos)
                .totalNaoCompareceu(totalNaoCompareceu)
                .clienteDesde(cliente.getDataCriacao())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ClienteDuplicataDTO> buscarDuplicatas(Long unidadeId) {
        log.debug("Buscando duplicatas: unidade={}", unidadeId);

        List<Cliente> clientes = clienteRepository.findByUnidadeId(unidadeId);

        List<ClienteDuplicataDTO> grupos = new ArrayList<>();
        Set<Long> processados = new HashSet<>();

        for (Cliente c : clientes) {
            if (processados.contains(c.getId())) continue;

            List<Cliente> similaresPorNome = new ArrayList<>();
            List<Cliente> similaresPorTelefone = new ArrayList<>();

            // Busca por nome similar (pelo menos 4 caracteres)
            if (c.getNome() != null && c.getNome().trim().length() >= 4) {
                String[] partes = c.getNome().trim().split("\\s+");
                String primeiroNome = partes[0];
                if (primeiroNome.length() >= 4) {
                    similaresPorNome = clienteRepository.findByUnidadeIdAndNomeSimilar(
                            unidadeId, primeiroNome, c.getId());
                }
            }

            // Busca por telefone igual
            if (c.getTelefone() != null && !c.getTelefone().trim().isEmpty()) {
                similaresPorTelefone = clienteRepository.findByUnidadeIdAndTelefone(
                        unidadeId, c.getTelefone(), c.getId());
            }

            if (!similaresPorNome.isEmpty()) {
                List<ClienteDTO> grupo = new ArrayList<>();
                grupo.add(clienteMapper.toDTO(c));
                similaresPorNome.stream()
                        .filter(s -> !processados.contains(s.getId()))
                        .map(clienteMapper::toDTO)
                        .forEach(grupo::add);
                if (grupo.size() > 1) {
                    grupos.add(ClienteDuplicataDTO.builder()
                            .clientes(grupo)
                            .motivoSimilaridade("nome")
                            .build());
                    similaresPorNome.forEach(s -> processados.add(s.getId()));
                }
            } else if (!similaresPorTelefone.isEmpty()) {
                List<ClienteDTO> grupo = new ArrayList<>();
                grupo.add(clienteMapper.toDTO(c));
                similaresPorTelefone.stream()
                        .filter(s -> !processados.contains(s.getId()))
                        .map(clienteMapper::toDTO)
                        .forEach(grupo::add);
                if (grupo.size() > 1) {
                    grupos.add(ClienteDuplicataDTO.builder()
                            .clientes(grupo)
                            .motivoSimilaridade("telefone")
                            .build());
                    similaresPorTelefone.forEach(s -> processados.add(s.getId()));
                }
            }

            processados.add(c.getId());
        }

        return grupos;
    }

    private LocalDateTime toLocalDateTime(Object obj) {
        if (obj instanceof LocalDateTime) return (LocalDateTime) obj;
        if (obj instanceof java.sql.Timestamp) return ((java.sql.Timestamp) obj).toLocalDateTime();
        if (obj instanceof java.time.Instant) return LocalDateTime.ofInstant((java.time.Instant) obj, java.time.ZoneId.systemDefault());
        throw new IllegalArgumentException("Cannot convert to LocalDateTime: " + obj.getClass());
    }
}
