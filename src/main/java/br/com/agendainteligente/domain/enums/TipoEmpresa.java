package br.com.agendainteligente.domain.enums;

/**
 * Tipos de regime tributário/empresarial
 * Determina qual integração de NFS-e será utilizada
 */
public enum TipoEmpresa {
    /**
     * Microempreendedor Individual
     * Utiliza NFS-e Nacional (Portal Nacional)
     */
    MEI,
    
    /**
     * Simples Nacional
     * Utiliza NFS-e Municipal (ABRASF - Manaus)
     */
    SIMPLES_NACIONAL,
    
    /**
     * Lucro Presumido
     * Utiliza NFS-e Municipal (ABRASF - Manaus)
     */
    LUCRO_PRESUMIDO,
    
    /**
     * Lucro Real
     * Utiliza NFS-e Municipal (ABRASF - Manaus)
     */
    LUCRO_REAL,
    
    /**
     * Outros regimes
     * Utiliza NFS-e Municipal (ABRASF - Manaus)
     */
    OUTROS
}

