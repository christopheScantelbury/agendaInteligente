package br.com.agendainteligente.service;

import br.com.agendainteligente.domain.entity.Cliente;
import br.com.agendainteligente.dto.ClienteDTO;
import br.com.agendainteligente.exception.ResourceNotFoundException;
import br.com.agendainteligente.exception.BusinessException;
import br.com.agendainteligente.mapper.ClienteMapper;
import br.com.agendainteligente.repository.ClienteRepository;
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
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;

    @Transactional(readOnly = true)
    @Cacheable(value = "clientes", unless = "#result.isEmpty()")
    public List<ClienteDTO> listarTodos() {
        log.debug("Listando todos os clientes");
        return clienteRepository.findAll().stream()
                .map(clienteMapper::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "clientes", key = "#id")
    public ClienteDTO buscarPorId(Long id) {
        log.debug("Buscando cliente com id: {}", id);
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + id));
        return clienteMapper.toDTO(cliente);
    }

    @Transactional(readOnly = true)
    public ClienteDTO buscarPorCpfCnpj(String cpfCnpj) {
        log.debug("Buscando cliente com CPF/CNPJ: {}", cpfCnpj);
        Cliente cliente = clienteRepository.findByCpfCnpj(cpfCnpj)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com CPF/CNPJ: " + cpfCnpj));
        return clienteMapper.toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public ClienteDTO criar(ClienteDTO clienteDTO) {
        log.debug("Criando novo cliente: {}", clienteDTO);
        
        if (clienteRepository.existsByCpfCnpj(clienteDTO.getCpfCnpj())) {
            throw new BusinessException("Já existe um cliente cadastrado com este CPF/CNPJ");
        }
        
        Cliente cliente = clienteMapper.toEntity(clienteDTO);
        cliente = clienteRepository.save(cliente);
        log.info("Cliente criado com sucesso. ID: {}", cliente.getId());
        return clienteMapper.toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public ClienteDTO atualizar(Long id, ClienteDTO clienteDTO) {
        log.debug("Atualizando cliente com id: {}", id);
        
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente não encontrado com id: " + id));
        
        // Verifica se o CPF/CNPJ está sendo alterado e se já existe outro cliente com ele
        if (!cliente.getCpfCnpj().equals(clienteDTO.getCpfCnpj()) 
                && clienteRepository.existsByCpfCnpj(clienteDTO.getCpfCnpj())) {
            throw new BusinessException("Já existe outro cliente cadastrado com este CPF/CNPJ");
        }
        
        clienteMapper.updateEntityFromDTO(clienteDTO, cliente);
        cliente = clienteRepository.save(cliente);
        log.info("Cliente atualizado com sucesso. ID: {}", cliente.getId());
        return clienteMapper.toDTO(cliente);
    }

    @Transactional
    @CacheEvict(value = "clientes", allEntries = true)
    public void excluir(Long id) {
        log.debug("Excluindo cliente com id: {}", id);
        
        if (!clienteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Cliente não encontrado com id: " + id);
        }
        
        clienteRepository.deleteById(id);
        log.info("Cliente excluído com sucesso. ID: {}", id);
    }
}

