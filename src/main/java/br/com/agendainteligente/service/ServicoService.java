package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Servico;
import br.com.agendainteligente.dto.ServicoDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.mapper.ServicoMapper;
import br.com.agendainteligente.repository.ServicoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServicoService {

    private final ServicoRepository servicoRepository;
    private final ServicoMapper servicoMapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "servicos", unless = "#result.isEmpty()")
    public List<ServicoDTO> listarTodos() {
        log.debug("Listando todos os serviços");
        return servicoRepository.findAll().stream()
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "servicos", key = "'ativos'", unless = "#result.isEmpty()")
    public List<ServicoDTO> listarAtivos() {
        log.debug("Listando serviços ativos");
        return servicoRepository.findByAtivoTrue().stream()
                .map(servicoMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ServicoDTO buscarPorId(Long id) {
        log.debug("Buscando serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO criar(ServicoDTO servicoDTO) {
        log.debug("Criando novo serviço: {}", servicoDTO);
        Servico servico = servicoMapper.toEntity(servicoDTO);
        servico = servicoRepository.save(servico);
        log.info("Serviço criado com sucesso. ID: {}", servico.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public ServicoDTO atualizar(Long id, ServicoDTO servicoDTO) {
        log.debug("Atualizando serviço com id: {}", id);
        Servico servico = servicoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Serviço não encontrado com id: " + id));
        servicoMapper.updateEntityFromDTO(servicoDTO, servico);
        servico = servicoRepository.save(servico);
        log.info("Serviço atualizado com sucesso. ID: {}", servico.getId());
        return servicoMapper.toDTO(servico);
    }

    @Transactional
    public void excluir(Long id) {
        log.debug("Excluindo serviço com id: {}", id);
        if (!servicoRepository.existsById(id)) {
            throw new ResourceNotFoundException("Serviço não encontrado com id: " + id);
        }
        servicoRepository.deleteById(id);
        log.info("Serviço excluído com sucesso. ID: {}", id);
    }
}

