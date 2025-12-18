-- SQL para corrigir as policies do bucket de fotos
-- Execute isso no SQL Editor do Supabase

-- 1. Remover todas as policies antigas (se existirem)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "acesso a fotos" ON storage.objects;

-- 2. Criar policy para permitir SELECT (leitura) público
CREATE POLICY "Public read access to colaboradores-fotos"
ON storage.objects FOR SELECT
USING (bucket_id = 'colaboradores-fotos');

-- 3. (Opcional) Permitir INSERT apenas para usuários autenticados
CREATE POLICY "Authenticated users can upload to colaboradores-fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'colaboradores-fotos');

-- 4. (Opcional) Permitir UPDATE apenas para usuários autenticados
CREATE POLICY "Authenticated users can update colaboradores-fotos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'colaboradores-fotos');

-- 5. (Opcional) Permitir DELETE apenas para usuários autenticados
CREATE POLICY "Authenticated users can delete from colaboradores-fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'colaboradores-fotos');

-- 6. Verificar as policies criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND policyname LIKE '%colaboradores-fotos%';

-- 7. IMPORTANTE: Verificar se o bucket está configurado como PUBLIC
-- Se não estiver, execute este UPDATE:
UPDATE storage.buckets 
SET public = true 
WHERE id = 'colaboradores-fotos';

-- 8. Verificar configuração do bucket
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'colaboradores-fotos';
