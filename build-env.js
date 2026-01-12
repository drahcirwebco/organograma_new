#!/usr/bin/env node

// build-env.js - Gera arquivo config.json com variáveis de ambiente
const fs = require('fs');
const path = require('path');

// Na Vercel, as variáveis estão prefixadas com NEXT_PUBLIC_
const supabaseUrl = process.env.NEXT_PUBLIC_VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

console.log('🔍 Buscando variáveis de ambiente:');
console.log('  NEXT_PUBLIC_VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
console.log('  NEXT_PUBLIC_VITE_SUPABASE_KEY:', supabaseKey ? '✓' : '✗');

// Gerar config.json
const configContent = {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_KEY: supabaseKey
};

const configPath = path.join(__dirname, 'config.json');
fs.writeFileSync(configPath, JSON.stringify(configContent, null, 2));
console.log('✅ Config.json gerado com sucesso');
