package br.com.agendainteligente.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.time.LocalDateTime;

public class FutureOrPresentValidator implements ConstraintValidator<FutureOrPresent, LocalDateTime> {
    
    @Override
    public void initialize(FutureOrPresent constraintAnnotation) {
        // Não precisa de inicialização
    }
    
    @Override
    public boolean isValid(LocalDateTime value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // A validação de @NotNull cuida disso
        }
        return !value.isBefore(LocalDateTime.now());
    }
}

