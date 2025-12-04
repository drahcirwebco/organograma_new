// Script para adicionar o campo "Regime" aos colaboradores
// Executar: node add-regime-field.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'colaboradores.json');

// Ler arquivo
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

// Adicionar regime de forma estratificada
// - Diretores: CLT
// - Cargos altos (Gerentes, Coordenadores): CLT ou PJ (50/50)
// - Cargos médios: CLT ou PJ (70% CLT, 30% PJ)
// - Cargos baixos: CLT (90%)

const getRegime = (colaborador) => {
  const cargo = (colaborador.Cargo || '').toLowerCase();
  
  // Diretores sempre CLT
  if (cargo.includes('diretor') || cargo.includes('diretora')) {
    return 'CLT';
  }
  
  // Presidente sempre CLT
  if (cargo.includes('presidente')) {
    return 'CLT';
  }
  
  // Vice-presidente CLT
  if (cargo.includes('vice')) {
    return 'CLT';
  }
  
  // Gerentes: 60% CLT, 40% PJ
  if (cargo.includes('gerente') || cargo.includes('gerência')) {
    return Math.random() < 0.6 ? 'CLT' : 'PJ';
  }
  
  // Coordenadores: 55% CLT, 45% PJ
  if (cargo.includes('coordenador') || cargo.includes('coordenadora')) {
    return Math.random() < 0.55 ? 'CLT' : 'PJ';
  }
  
  // Supervisores: 65% CLT, 35% PJ
  if (cargo.includes('supervisor') || cargo.includes('supervisora')) {
    return Math.random() < 0.65 ? 'CLT' : 'PJ';
  }
  
  // Analistas: 50% CLT, 50% PJ
  if (cargo.includes('analista')) {
    return Math.random() < 0.5 ? 'CLT' : 'PJ';
  }
  
  // Consultores: 30% CLT, 70% PJ
  if (cargo.includes('consultor') || cargo.includes('consultoria')) {
    return Math.random() < 0.3 ? 'CLT' : 'PJ';
  }
  
  // Desenvolvedores: 45% CLT, 55% PJ
  if (cargo.includes('desenvolvedor')) {
    return Math.random() < 0.45 ? 'CLT' : 'PJ';
  }
  
  // Designers: 50% CLT, 50% PJ
  if (cargo.includes('designer') || cargo.includes('designer')) {
    return Math.random() < 0.5 ? 'CLT' : 'PJ';
  }
  
  // Padrão: 80% CLT, 20% PJ
  return Math.random() < 0.8 ? 'CLT' : 'PJ';
};

// Adicionar regime a cada colaborador
data.forEach(colaborador => {
  if (!colaborador.Regime) {
    colaborador.Regime = getRegime(colaborador);
  }
});

// Salvar arquivo
fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

console.log('✅ Campo "Regime" adicionado com sucesso a', data.length, 'colaboradores!');

// Contar distribuição
const cltCount = data.filter(c => c.Regime === 'CLT').length;
const pjCount = data.filter(c => c.Regime === 'PJ').length;
console.log(`📊 Distribuição: ${cltCount} CLT (${((cltCount/data.length)*100).toFixed(1)}%), ${pjCount} PJ (${((pjCount/data.length)*100).toFixed(1)}%)`);
