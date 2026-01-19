package br.com.agendainteligente.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

public class FutureOrPresentValidator implements ConstraintValidator<FutureOrPresent, LocalDateTime> {
    
    private static final int TOLERANCIA_MINUTOS = 120;
    
    @Override
    public void initialize(FutureOrPresent constraintAnnotation) {
        // Não precisa de inicialização
    }
    
    @Override
    public boolean isValid(LocalDateTime value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // A validação de @NotNull cuida disso
        }
        LocalDateTime agora = LocalDateTime.now();
        LocalDateTime limiteMinimo = agora.minus(TOLERANCIA_MINUTOS, ChronoUnit.MINUTES);
        return !value.isBefore(limiteMinimo);
    }
}



