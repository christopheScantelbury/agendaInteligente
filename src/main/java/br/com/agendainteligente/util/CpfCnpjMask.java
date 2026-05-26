package br.com.agendainteligente.util;

/**
 * Mascaramento de CPF/CNPJ para retornos de API (LGPD/proteção contra leak).
 * CPF: expõe só os 5 últimos dígitos. CNPJ: expõe filial + check.
 * Aplicado em ClienteService.toDTO e AtendenteService.toDTO.
 */
public final class CpfCnpjMask {

    private CpfCnpjMask() {}

    public static String mask(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        String digits = raw.replaceAll("\\D", "");
        if (digits.length() == 11) {
            return "xxx.xxx." + digits.substring(6, 9) + "-" + digits.substring(9);
        }
        if (digits.length() == 14) {
            return "xx.xxx.xxx/" + digits.substring(8, 12) + "-" + digits.substring(12);
        }
        if (digits.length() > 4) {
            return "x".repeat(digits.length() - 4) + digits.substring(digits.length() - 4);
        }
        return raw;
    }
}
