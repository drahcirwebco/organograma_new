// config.js - Carrega as variáveis de ambiente

const getEnvVariable = (name) => {
  // 1. Procurar em window.__ENV__ (injetado pelo env.js gerado no build)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[name]) {
    return window.__ENV__[name];
  }
  
  // 2. Fallback: localStorage (para desenvolvimento local)
  if (typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(name);
    if (value && value !== 'undefined') return value;
  }
  
  return null;
};

export const SUPABASE_URL = getEnvVariable('VITE_SUPABASE_URL');
export const SUPABASE_KEY = getEnvVariable('VITE_SUPABASE_KEY');

// Validar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ NÃO ENCONTRADA');
  console.error('VITE_SUPABASE_KEY:', SUPABASE_KEY ? '✓' : '✗ NÃO ENCONTRADA');
  console.error('\n📝 Para usar LOCALMENTE, abra o Console (F12) e execute:');
  console.error("  localStorage.setItem('VITE_SUPABASE_URL', 'https://seu-projeto.supabase.co')");
  console.error("  localStorage.setItem('VITE_SUPABASE_KEY', 'sua-chave-aqui')");
  console.error('  window.location.reload()');
} else {
  console.log('✅ Variáveis de ambiente carregadas com sucesso!');
}
