package br.com.agendainteligente.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String senha = "admin123";
        String hash = encoder.encode(senha);
        System.out.println("Senha: " + senha);
        System.out.println("Hash: " + hash);
        System.out.println("Verificação: " + encoder.matches(senha, hash));
    }
}

