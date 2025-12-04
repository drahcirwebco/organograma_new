# 🔍 Instruções para Debug - Organograma App

## Status Atual
- ✅ Servidor rodando em `http://127.0.0.1:3010`
- ✅ Código corrigido com enhanced logging
- ⏳ Aguardando teste no navegador

## O Que Fazer Agora

### 1. Abra o navegador
- URL: `http://127.0.0.1:3010`

### 2. Abra o Console (F12 ou Ctrl+Shift+J)
Você deve ver uma sequência de logs como esta:

```
🚀 Inicializando aplicação com Supabase...
⏳ Inicializando Supabase...
🔧 Inicializando Supabase...
✅ Supabase inicializado com sucesso!
🌍 fetchColaboradores() chamado
⏳ Inicializando Supabase...
🔄 Buscando colaboradores do Supabase...
📦 URL: https://pyinmcinjcyelavkuhfl.supabase.co
📦 Tabela: tabela_organograma
✅ Resposta do Supabase: 544 linhas
📊 Primeiros 5 registros: [...] 
📊 Estrutura do primeiro item:
   Campos: [...lista de campos...]
   Valores: {...}
📥 Buscando colaboradores do Supabase...
✅ window.fetchColaboradores disponível
✅ Dados mapeados: 544 colaboradores
✅ Primeiro colaborador mapeado: {...}
🎨 Renderizando Presidência View...
✅ Renderização completa!
✅ Aplicação inicializada com sucesso!
```

### 3. Se Vir Logs ✅
- Copie e cole os logs aqui
- Diga se os dados aparecem na página ou se ainda mostra "Carregando"

### 4. Se NÃO Vir Logs ❌
Procure por:
- `❌ Erro ao...` - mostra qual erro aconteceu
- `Uncaught` ou `Uncaught Error` - erros não tratados

## O Que Mudei

### 📝 `js/supabaseClient.js`
- Adicionado log `🌍 fetchColaboradores() chamado` no início da função
- Adicionado logs detalhados mostrando:
  - Primeiros 5 registros
  - Estrutura e campos do primeiro item
  - Erros com stack trace

### 📝 `js/app.js`
- Adicionado timeout de 10 segundos para evitar travar
- Logs em cada etapa da pipeline:
  - `📥 Buscando colaboradores...`
  - `✅ Dados mapeados...`
  - `🎨 Renderizando Presidência View...`
  - `✅ Renderização completa!`

## Checklist de Diagnóstico

Use este checklist para identificar onde o problema está:

- [ ] Página carrega sem erro (não mostra erro 404 ou similar)
- [ ] Console mostra `🚀 Inicializando aplicação...` (app.js carregou)
- [ ] Console mostra `⏳ Inicializando Supabase...` (supabaseClient.js carregou)
- [ ] Console mostra `🌍 fetchColaboradores() chamado` (função foi acionada)
- [ ] Console mostra `✅ Resposta do Supabase: XXX linhas` (dados chegaram)
- [ ] Console mostra `✅ Dados mapeados: XXX colaboradores` (mapeamento funcionou)
- [ ] Console mostra `✅ Renderização completa!` (renderização terminou)
- [ ] Página exibe organograma (sem spinner infinito)

## Próximos Passos

**Se dados carregarem com sucesso:**
- Verificar se filtro de Regime está funcionando
- Testar adicionar/editar/deletar colaboradores
- Validar export XLSX

**Se dados NÃO carregarem:**
- Procure por mensagens `❌` nos logs
- Procure por `error` ou `Error` nos logs
- Copie a mensagem de erro e compartilhe
