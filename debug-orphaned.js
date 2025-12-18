// debug-orphaned.js - Analisar colaboradores órfãos

// Execute isto no console do navegador após abrir a página:
/*

async function debugOrphaned() {
  const { data } = await window.initSupabase()
    .from('tabela_organograma')
    .select('*');
  
  console.log('=== ANÁLISE DE COLABORADORES ÓRFÃOS ===\n');
  
  // Mapa de todos os nomes
  const todosNomes = new Set(data.map(d => (d.nome || d.Colaborador || '').toLowerCase().trim()));
  
  // Encontrar órfãos
  const orfaos = data.filter(col => {
    const gestor = (col.gestor || col.Gestor || '').toLowerCase().trim();
    return gestor === '' || !todosNomes.has(gestor);
  });
  
  console.log(`\n📊 Total: ${data.length}`);
  console.log(`👥 Com gestor válido: ${data.length - orfaos.length}`);
  console.log(`⚠️ ÓRFÃOS (sem gestor válido): ${orfaos.length}\n`);
  
  if (orfaos.length > 0) {
    console.log('=== COLABORADORES ÓRFÃOS ===');
    orfaos.forEach(col => {
      console.log(`
👤 ${col.Colaborador || col.nome}
   Cargo: ${col.Cargo || col.cargo}
   Área: ${col['Área'] || col.area}
   Gestor atual: "${col.Gestor || col.gestor || '(VAZIO)'}"
   ID: ${col.id}
      `);
    });
  }
  
  console.log('\n💡 Para vincular um órfão, use o botão "Editar" ou faça um UPDATE:');
  console.log('UPDATE tabela_organograma SET gestor = "Nome do Novo Gestor" WHERE id = "..."');
}

debugOrphaned();

*/

console.log('✅ debug-orphaned.js carregado. Execute debugOrphaned() no console para analisar órfãos.');
