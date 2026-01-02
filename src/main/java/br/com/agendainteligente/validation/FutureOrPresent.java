package br.com.agendainteligente.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = FutureOrPresentValidator.class)
@Documented
public @interface FutureOrPresent {
    String message() default "Data/hora deve ser atual ou futura";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

