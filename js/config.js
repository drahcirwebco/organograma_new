// config.js - Carrega as variáveis de ambiente

// Tentar carregar do window (para quando injetado pelo servidor)
// Ou do localStorage (para desenvolvimento local)
// Ou das variáveis de ambiente do build

const getEnvVariable = (name) => {
  // Primeiro tenta window (Vercel injeta aqui)
  if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[name]) {
    return window.__ENV__[name];
  }
  
  // Depois tenta localStorage (para desenvolvimento local)
  if (typeof localStorage !== 'undefined') {
    const value = localStorage.getItem(name);
    if (value) return value;
  }
  
  return undefined;
};

export const SUPABASE_URL = getEnvVariable('VITE_SUPABASE_URL');
export const SUPABASE_KEY = getEnvVariable('VITE_SUPABASE_KEY');

// Validar se as variáveis estão definidas
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Variáveis de ambiente não configuradas!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_KEY:', SUPABASE_KEY ? '✓' : '✗');
}
