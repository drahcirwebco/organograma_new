-- SQL para corrigir coordenadores órfãos no Supabase
-- Execute isto no Supabase SQL Editor

-- 1. Primeiro, verificar quem está órfão
SELECT id, Colaborador, Cargo, "Área", Gestor 
FROM tabela_organograma 
WHERE (Gestor IS NULL OR Gestor = '' OR Gestor = 'null')
  AND (Cargo ILIKE '%coordenador%' OR Cargo ILIKE '%supervisor%')
ORDER BY Colaborador;

-- 2. Se DIEGO está nessa lista, vincule-o ao seu gestor
-- Opção A: Se ele deve responder para MARTHA (Gerente E-Commerce):
UPDATE tabela_organograma 
SET Gestor = 'MARTHA IRIGOYEN LAMAS'
WHERE Colaborador ILIKE '%DIEGO%' 
  AND Cargo ILIKE '%LOGISTICA%';

-- Opção B: Se ele deve responder para RODRIGO (Gerente Marketing):
-- UPDATE tabela_organograma 
-- SET Gestor = 'RODRIGO DE QUADROS VICENCIO'
-- WHERE Colaborador ILIKE '%DIEGO%' 
--   AND Cargo ILIKE '%LOGISTICA%';

-- Opção C: Se ele deve responder diretamente ao Presidente:
-- UPDATE tabela_organograma 
-- SET Gestor = '(nome do presidente)'
-- WHERE Colaborador ILIKE '%DIEGO%' 
--   AND Cargo ILIKE '%LOGISTICA%';

-- 3. Verificar resultado
SELECT id, Colaborador, Cargo, "Área", Gestor 
FROM tabela_organograma 
WHERE Colaborador ILIKE '%DIEGO%';
