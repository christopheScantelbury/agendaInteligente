package br.com.agendainteligente.service;

import br.com.agendainteligente.repository.AgendamentoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RelatorioService {

    private final AgendamentoRepository agendamentoRepository;

    public record FaturamentoMensalDTO(
            String mes,
            long totalAgendamentos,
            BigDecimal faturamento
    ) {}

    public record TopServicoDTO(
            String servicoNome,
            long totalRealizados,
            BigDecimal receitaTotal
    ) {}

    public record TaxaRetornoDTO(
            String mes,
            long clientesUnicos,
            long clientesRetorno,
            double taxaRetorno
    ) {}

    public List<FaturamentoMensalDTO> faturamentoMensal(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findFaturamentoMensal(inicio, fim, unidadeId)
                .stream()
                .map(row -> new FaturamentoMensalDTO(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO
                ))
                .collect(Collectors.toList());
    }

    public List<TopServicoDTO> topServicos(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findTopServicos(inicio, fim, unidadeId)
                .stream()
                .map(row -> new TopServicoDTO(
                        (String) row[0],
                        ((Number) row[1]).longValue(),
                        row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO
                ))
                .collect(Collectors.toList());
    }

    public List<TaxaRetornoDTO> taxaRetorno(int meses, Long unidadeId) {
        LocalDateTime fim = LocalDateTime.now();
        LocalDateTime inicio = fim.minusMonths(meses);
        return agendamentoRepository.findTaxaRetorno(inicio, fim, unidadeId)
                .stream()
                .map(row -> {
                    long unicos = ((Number) row[1]).longValue();
                    long retorno = ((Number) row[2]).longValue();
                    double taxa = unicos > 0 ? (double) retorno / unicos * 100 : 0.0;
                    return new TaxaRetornoDTO((String) row[0], unicos, retorno, taxa);
                })
                .collect(Collectors.toList());
    }
}
