-- Remover colunas logo e cor_app de unidades (já foram movidas para empresas)
ALTER TABLE unidades 
    DROP COLUMN IF EXISTS logo,
    DROP COLUMN IF EXISTS cor_app;
