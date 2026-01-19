package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Reclamacao;
import br.com.agendainteligente.dto.ReclamacaoDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ReclamacaoMapper;
import br.com.agendainteligente.repository.ReclamacaoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamacaoService {

    private final ReclamacaoRepository reclamacaoRepository;
    private final ReclamacaoMapper reclamacaoMapper;

    @Transactional
    public ReclamacaoDTO criar(ReclamacaoDTO reclamacaoDTO) {
        Reclamacao reclamacao = reclamacaoMapper.toEntity(reclamacaoDTO);
        reclamacao.setLida(false);
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação anônima criada. ID: {}", reclamacao.getId());
        return reclamacaoMapper.toDTO(reclamacao);
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarTodas() {
        return reclamacaoRepository.findAll().stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarNaoLidas() {
        return reclamacaoRepository.findByLidaFalseOrderByDataCriacaoDesc().stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarPorUnidade(Long unidadeId) {
        return reclamacaoRepository.findByUnidadeIdOrderByDataCriacaoDesc(unidadeId).stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ReclamacaoDTO> listarNaoLidasPorUnidade(Long unidadeId) {
        return reclamacaoRepository.findByUnidadeIdAndLidaFalseOrderByDataCriacaoDesc(unidadeId).stream()
                .map(reclamacaoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Long contarNaoLidas() {
        return reclamacaoRepository.countByLidaFalse();
    }

    @Transactional(readOnly = true)
    public Long contarNaoLidasPorUnidade(Long unidadeId) {
        return reclamacaoRepository.countByUnidadeIdAndLidaFalse(unidadeId);
    }

    @Transactional
    public ReclamacaoDTO marcarComoLida(Long id) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reclamação não encontrada"));
        reclamacao.setLida(true);
        reclamacao = reclamacaoRepository.save(reclamacao);
        log.info("Reclamação marcada como lida. ID: {}", id);
        return reclamacaoMapper.toDTO(reclamacao);
    }

    @Transactional(readOnly = true)
    public ReclamacaoDTO buscarPorId(Long id) {
        Reclamacao reclamacao = reclamacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reclamação não encontrada"));
        return reclamacaoMapper.toDTO(reclamacao);
    }
}
