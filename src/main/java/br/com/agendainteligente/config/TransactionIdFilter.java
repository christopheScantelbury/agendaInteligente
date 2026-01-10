package br.com.agendainteligente.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@Order(1)
public class TransactionIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        // Obtém Transaction ID do header ou gera um novo
        String transactionId = request.getHeader("X-Transaction-ID");
        if (transactionId == null || transactionId.isEmpty()) {
            transactionId = UUID.randomUUID().toString();
        }
        
        // Adiciona ao MDC para logs
        MDC.put("transactionId", transactionId);
        
        // Adiciona ao response header para rastreamento
        response.setHeader("X-Transaction-ID", transactionId);
        
        try {
            log.debug("Request: {} {} - TransactionID: {}", 
                request.getMethod(), 
                request.getRequestURI(), 
                transactionId);
            
            filterChain.doFilter(request, response);
        } finally {
            // Remove do MDC após processamento
            MDC.remove("transactionId");
        }
    }
}
