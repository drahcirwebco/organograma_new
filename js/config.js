// config.js - Carrega as variáveis de ambiente

console.log('🔧 config.js carregado');
console.log('   window.__ENV__:', window.__ENV__);

const getEnvVariable = (name) => {
  // 1. Se window.__ENV__ existe, usar
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[name]) {
    console.log(`   ✓ ${name} encontrado em window.__ENV__`);
    return window.__ENV__[name];
  }
  
  // 2. Fallback: localStorage (para desenvolvimento local)
  if (typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(name);
    if (value && value !== 'undefined') {
      console.log(`   ✓ ${name} carregado de localStorage`);
      return value;
    }
  }
  
  console.error(`   ✗ ${name} não encontrado!`);
  return null;
};

export const SUPABASE_URL = getEnvVariable('VITE_SUPABASE_URL');
export const SUPABASE_KEY = getEnvVariable('VITE_SUPABASE_KEY');

// Validar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ ERRO: Variáveis de ambiente não configuradas!');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ NÃO ENCONTRADA');
  console.error('VITE_SUPABASE_KEY:', SUPABASE_KEY ? '✓' : '✗ NÃO ENCONTRADA');
} else {
  console.log('✅ Variáveis de ambiente carregadas com sucesso!');
  console.log('   URL:', SUPABASE_URL);
}
