package br.com.agendainteligente.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class JwtTokenProvider {

    @Value("${jwt.secret:mySecretKey123456789012345678901234567890}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}") // 24 horas
    private long jwtExpiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Authentication authentication) {
        return generateToken(authentication, null, null);
    }

    /**
     * Gera token com claims extras de impersonação (#94).
     * @param impersonatedBy id do ADMIN global que assumiu a sessão (claim "imp_by")
     * @param ttlMillis TTL custom em ms (null = default 24h). Para impersonação: 15min.
     */
    public String generateToken(Authentication authentication, Long impersonatedBy, Long ttlMillis) {
        String username = authentication.getName();
        String authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        Date now = new Date();
        long ttl = ttlMillis != null ? ttlMillis : jwtExpiration;
        Date expiryDate = new Date(now.getTime() + ttl);

        var builder = Jwts.builder()
                .subject(username)
                .claim("authorities", authorities)
                .issuedAt(now)
                .expiration(expiryDate);

        if (impersonatedBy != null) {
            builder.claim("imp_by", impersonatedBy);
        }

        return builder.signWith(getSigningKey()).compact();
    }

    public Long getImpersonatedByFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        Object imp = claims.get("imp_by");
        if (imp == null) return null;
        return Long.valueOf(imp.toString());
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();
    }

    public List<String> getAuthoritiesFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        
        String authorities = claims.get("authorities", String.class);
        if (authorities != null && !authorities.isEmpty()) {
            return Arrays.asList(authorities.split(","));
        }
        return List.of();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}

