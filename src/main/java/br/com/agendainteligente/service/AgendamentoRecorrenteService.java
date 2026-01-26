package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Agendamento;
import br.com.agendainteligente.domain.entity.AgendamentoServico;
import br.com.agendainteligente.domain.entity.Atendente;
import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.domain.entity.Unidade;
import br.com.agendainteligente.domain.enums.StatusAgendamento;
import br.com.agendainteligente.dto.AgendamentoDTO;
import br.com.agendainteligente.dto.AgendamentoServicoDTO;
import br.com.agendainteligente.dto.RecorrenciaDTO;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.repository.AgendamentoRepository;
import br.com.agendainteligente.repository.AgendamentoServicoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Serviço para gerenciar agendamentos recorrentes
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgendamentoRecorrenteService {

    private final AgendamentoRepository agendamentoRepository;
    private final AgendamentoServicoRepository agendamentoServicoRepository;

    /**
     * Cria uma série de agendamentos recorrentes baseado na configuração
     */
    @Transactional
    public List<Agendamento> criarAgendamentosRecorrentes(
            AgendamentoDTO agendamentoBaseDTO,
            RecorrenciaDTO recorrenciaDTO,
            Cliente cliente,
            Unidade unidade,
            Atendente atendente,
            List<Servico> servicos,
            List<AgendamentoServicoDTO> servicosDTO,
            BigDecimal valorTotal,
            int duracaoTotal) {

        if (recorrenciaDTO == null || !recorrenciaDTO.getRecorrente()) {
            throw new BusinessException("Configuração de recorrência inválida");
        }

        // Gera ID único para a série
        String serieId = UUID.randomUUID().toString();
        LocalDateTime dataHoraInicio = agendamentoBaseDTO.getDataHoraInicio();
        LocalTime horario = dataHoraInicio.toLocalTime();

        // Calcula todas as datas baseado no tipo de recorrência
        List<LocalDate> datas = calcularDatasRecorrencia(
                dataHoraInicio.toLocalDate(),
                recorrenciaDTO
        );

        if (datas.isEmpty()) {
            throw new BusinessException("Nenhuma data válida encontrada para a recorrência");
        }

        log.info("Criando {} agendamentos recorrentes para série {}", datas.size(), serieId);

        List<Agendamento> agendamentosCriados = new ArrayList<>();
        Agendamento agendamentoOriginal = null;

        for (int i = 0; i < datas.size(); i++) {
            LocalDate data = datas.get(i);
            LocalDateTime dataHoraInicioAtual = LocalDateTime.of(data, horario);
            LocalDateTime dataHoraFimAtual = dataHoraInicioAtual.plusMinutes(duracaoTotal);

            // Verifica conflito de horário
            if (agendamentoRepository.findConflitoHorario(
                    atendente.getId(), dataHoraInicioAtual, dataHoraFimAtual).isPresent()) {
                log.warn("Conflito de horário detectado para data {} - pulando", data);
                continue; // Pula este agendamento se houver conflito
            }

            // Cria agendamento
            Agendamento agendamento = Agendamento.builder()
                    .cliente(cliente)
                    .unidade(unidade)
                    .atendente(atendente)
                    .dataHoraInicio(dataHoraInicioAtual)
                    .dataHoraFim(dataHoraFimAtual)
                    .observacoes(agendamentoBaseDTO.getObservacoes())
                    .valorTotal(valorTotal)
                    .status(StatusAgendamento.AGENDADO)
                    .agendamentoRecorrente(true)
                    .serieRecorrenciaId(serieId)
                    .agendamentoOriginalId(i == 0 ? null : (agendamentoOriginal != null ? agendamentoOriginal.getId() : null))
                    .build();

            agendamento = agendamentoRepository.save(agendamento);

            // Se for o primeiro, salva como original
            if (i == 0) {
                agendamentoOriginal = agendamento;
                // Atualiza o original para ter referência a si mesmo
                agendamento.setAgendamentoOriginalId(null);
                agendamento = agendamentoRepository.save(agendamento);
            } else {
                // Atualiza para referenciar o original
                agendamento.setAgendamentoOriginalId(agendamentoOriginal.getId());
                agendamento = agendamentoRepository.save(agendamento);
            }

            // Cria serviços do agendamento
            List<AgendamentoServico> agendamentoServicos = criarAgendamentoServicos(
                    agendamento, servicos, servicosDTO);
            agendamentoServicoRepository.saveAll(agendamentoServicos);
            agendamento.setServicos(agendamentoServicos);

            agendamentosCriados.add(agendamento);
        }

        log.info("Criados {} agendamentos recorrentes da série {}", agendamentosCriados.size(), serieId);
        return agendamentosCriados;
    }

    /**
     * Calcula todas as datas baseado na configuração de recorrência
     */
    private List<LocalDate> calcularDatasRecorrencia(LocalDate dataInicio, RecorrenciaDTO recorrencia) {
        List<LocalDate> datas = new ArrayList<>();

        RecorrenciaDTO.TipoRecorrencia tipo = recorrencia.getTipoRecorrencia();
        RecorrenciaDTO.TipoTermino tipoTermino = recorrencia.getTipoTermino();
        Integer intervalo = recorrencia.getIntervalo() != null ? recorrencia.getIntervalo() : 1;

        LocalDate dataAtual = dataInicio;
        LocalDate dataLimite = null;
        Integer ocorrenciasRestantes = null;

        // Define limite baseado no tipo de término
        switch (tipoTermino) {
            case DATA:
                dataLimite = recorrencia.getDataTermino();
                if (dataLimite == null || dataLimite.isBefore(dataInicio)) {
                    throw new BusinessException("Data de término inválida");
                }
                break;
            case OCORRENCIAS:
                ocorrenciasRestantes = recorrencia.getNumeroOcorrencias();
                if (ocorrenciasRestantes == null || ocorrenciasRestantes < 1) {
                    throw new BusinessException("Número de ocorrências inválido");
                }
                break;
            case INFINITA:
                // Limita a 2 anos para evitar criar muitos agendamentos
                dataLimite = dataInicio.plusYears(2);
                break;
        }

        // Calcula datas baseado no tipo de recorrência
        switch (tipo) {
            case DIARIA:
                datas = calcularDatasDiarias(dataAtual, dataLimite, ocorrenciasRestantes, intervalo);
                break;
            case SEMANAL:
                List<DayOfWeek> diasSemana = recorrencia.getDiasDaSemanaAsDayOfWeek();
                if (diasSemana.isEmpty()) {
                    throw new BusinessException("É necessário selecionar pelo menos um dia da semana");
                }
                datas = calcularDatasSemanais(dataAtual, dataLimite, ocorrenciasRestantes, diasSemana, intervalo);
                break;
            case MENSAL:
                datas = calcularDatasMensais(dataAtual, dataLimite, ocorrenciasRestantes, intervalo);
                break;
            default:
                throw new BusinessException("Tipo de recorrência não suportado: " + tipo);
        }

        return datas;
    }

    private List<LocalDate> calcularDatasDiarias(
            LocalDate inicio, LocalDate limite, Integer ocorrencias, int intervalo) {
        List<LocalDate> datas = new ArrayList<>();
        LocalDate dataAtual = inicio;
        int contador = 0;

        while (true) {
            if (limite != null && dataAtual.isAfter(limite)) {
                break;
            }
            if (ocorrencias != null && contador >= ocorrencias) {
                break;
            }

            datas.add(dataAtual);
            contador++;
            dataAtual = dataAtual.plusDays(intervalo);
        }

        return datas;
    }

    private List<LocalDate> calcularDatasSemanais(
            LocalDate inicio, LocalDate limite, Integer ocorrencias,
            List<DayOfWeek> diasSemana, int intervalo) {
        List<LocalDate> datas = new ArrayList<>();
        LocalDate dataAtual = inicio;
        int contador = 0;
        int semanaOffset = 0; // Offset de semanas para intervalo

        // Encontra o primeiro dia válido na primeira semana
        while (!diasSemana.contains(dataAtual.getDayOfWeek())) {
            dataAtual = dataAtual.plusDays(1);
            if (limite != null && dataAtual.isAfter(limite)) {
                return datas;
            }
        }

        // Calcula todas as datas
        while (true) {
            if (limite != null && dataAtual.isAfter(limite)) {
                break;
            }
            if (ocorrencias != null && contador >= ocorrencias) {
                break;
            }

            // Para cada semana do intervalo, adiciona os dias selecionados
            LocalDate inicioSemana = dataAtual.minusDays(dataAtual.getDayOfWeek().getValue() - 1);
            
            for (DayOfWeek diaSemana : diasSemana) {
                LocalDate dataDia = inicioSemana.plusDays(diaSemana.getValue() - 1);
                
                // Só adiciona se for a partir da data inicial
                if (!dataDia.isBefore(inicio)) {
                    if (limite != null && dataDia.isAfter(limite)) {
                        continue;
                    }
                    if (ocorrencias != null && contador >= ocorrencias) {
                        break;
                    }
                    
                    datas.add(dataDia);
                    contador++;
                }
            }

            // Avança para a próxima semana do intervalo
            semanaOffset += intervalo;
            dataAtual = inicioSemana.plusWeeks(semanaOffset);
            
            // Se não há mais datas válidas, para
            if (limite != null && dataAtual.isAfter(limite)) {
                break;
            }
            if (ocorrencias != null && contador >= ocorrencias) {
                break;
            }
        }

        // Remove duplicatas e ordena
        return datas.stream().distinct().sorted().toList();
    }

    private List<LocalDate> calcularDatasMensais(
            LocalDate inicio, LocalDate limite, Integer ocorrencias, int intervalo) {
        List<LocalDate> datas = new ArrayList<>();
        LocalDate dataAtual = inicio;
        int contador = 0;

        while (true) {
            if (limite != null && dataAtual.isAfter(limite)) {
                break;
            }
            if (ocorrencias != null && contador >= ocorrencias) {
                break;
            }

            datas.add(dataAtual);
            contador++;
            dataAtual = dataAtual.plusMonths(intervalo);
        }

        return datas;
    }

    private List<AgendamentoServico> criarAgendamentoServicos(
            Agendamento agendamento, List<Servico> servicos, List<AgendamentoServicoDTO> servicosDTO) {
        List<AgendamentoServico> agendamentoServicos = new ArrayList<>();

        for (AgendamentoServicoDTO servicoDTO : servicosDTO) {
            Servico servico = servicos.stream()
                    .filter(s -> s.getId().equals(servicoDTO.getServicoId()))
                    .findFirst()
                    .orElseThrow();

            AgendamentoServico agendamentoServico = AgendamentoServico.builder()
                    .agendamento(agendamento)
                    .servico(servico)
                    .valor(servicoDTO.getValor() != null ? servicoDTO.getValor() : servico.getValor())
                    .descricao(servicoDTO.getDescricao() != null ? servicoDTO.getDescricao() : servico.getDescricao())
                    .quantidade(servicoDTO.getQuantidade() != null ? servicoDTO.getQuantidade() : 1)
                    .valorTotal(servicoDTO.getValorTotal())
                    .build();

            agendamentoServicos.add(agendamentoServico);
        }

        return agendamentoServicos;
    }
}
