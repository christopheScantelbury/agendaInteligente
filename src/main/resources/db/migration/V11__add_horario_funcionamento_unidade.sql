ALTER TABLE unidades ADD COLUMN horario_abertura TIME DEFAULT '08:00:00';
ALTER TABLE unidades ADD COLUMN horario_fechamento TIME DEFAULT '18:00:00';

-- Updating existing records to ensure they have the default values (redundant with DEFAULT but good for explicit history)
UPDATE unidades SET horario_abertura = '08:00:00', horario_fechamento = '18:00:00' WHERE horario_abertura IS NULL;
