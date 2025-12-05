// ========== CONFIGURAÇÃO DO SUPABASE ==========
const SUPABASE_URL = 'https://pyinmcinjcyelavkuhfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aW5tY2luamN5ZWxhdmt1aGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODA0NDIsImV4cCI6MjA2MzI1NjQ0Mn0.5UbxNTluLWoy56tBLL6tAAZZwLMj17uUDR8_nd9IMWA';
const SUPABASE_TABLE = 'tabela_organograma';

let supabase = null;

// Inicializar Supabase
async function initSupabase() {
  try {
    console.log('🔧 Inicializando Supabase...');
    console.log('📦 URL:', SUPABASE_URL);
    console.log('📦 Tabela:', SUPABASE_TABLE);
    
    const { createClient } = window.supabase;
    
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInBrowser: false
      },
      global: {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    });
    
    console.log('✅ Supabase inicializado com sucesso!');
    return supabase;
  } catch (error) {
    console.error('❌ Erro ao inicializar Supabase:', error.message);
    throw error;
  }
}

// Buscar colaboradores - SEM FILTRO PRIMEIRO
async function fetchColaboradores(filterRegime = 'Todos') {
  try {
    if (!supabase) {
      console.log('⏳ Supabase não inicializado, inicializando agora...');
      supabase = await initSupabase();
    }
    
    console.log('📥 Buscando colaboradores do Supabase...');
    console.log('🔍 Filtro de regime:', filterRegime);
    
    // Primeiro, buscar TUDO sem filtro para ver se existem dados
    console.log('📊 Buscando TODOS os dados sem filtro...');
    let query = supabase
      .from(SUPABASE_TABLE)
      .select('*');
    
    const { data: allData, error: allError, count: allCount } = await query;
    
    if (allError) {
      console.error('❌ Erro ao buscar todos:', allError);
      throw allError;
    }
    
    console.log(`✅ Total de registros na tabela: ${allData?.length || 0}`);
    
    if (allData && allData.length > 0) {
      console.log('📋 Primeiras 3 linhas da tabela:');
      console.log(JSON.stringify(allData.slice(0, 3), null, 2));
      console.log('🔑 Colunas disponíveis:', Object.keys(allData[0]));
    } else {
      console.warn('⚠️ ATENÇÃO: A tabela retornou 0 registros!');
      console.warn('Possíveis causas:');
      console.warn('1. RLS (Row Level Security) está bloqueando');
      console.warn('2. Sem permissão de leitura');
      console.warn('3. Tabela realmente vazia');
      return [];
    }
    
    // Se há dados, agora aplicar filtro se necessário
    if (filterRegime && filterRegime !== 'Todos') {
      console.log(`🔎 Aplicando filtro: regimeContratacao = "${filterRegime}"`);
      
      let filteredQuery = supabase
        .from(SUPABASE_TABLE)
        .select('*')
        .eq('regimeContratacao', filterRegime);
      
      const { data: filteredData, error: filteredError } = await filteredQuery;
      
      if (filteredError) {
        console.error('❌ Erro ao filtrar:', filteredError);
        console.warn('Retornando todos os dados...');
        return allData;
      }
      
      console.log(`✅ Dados filtrados: ${filteredData?.length || 0} registros`);
      return filteredData || [];
    }
    
    console.log(`✅ Retornando ${allData?.length || 0} colaboradores`);
    return allData || [];
    
  } catch (error) {
    console.error('❌ Erro em fetchColaboradores:', error);
    return [];
  }
}

// Adicionar colaborador
async function addColaborador(colaborador) {
  try {
    if (!supabase) {
      supabase = await initSupabase();
    }
    
    console.log('➕ Adicionando colaborador:', colaborador);
    
    // Mapear para as colunas EXATAS do banco (minúsculas)
    const dataToInsert = {
      'nome': colaborador.Colaborador || colaborador.nome || '',
      'cargo': colaborador.Cargo || colaborador.cargo || '',
      'area': colaborador['Área'] || colaborador.area || colaborador.Departamento || '',
      'gestor': colaborador.Gestor || colaborador.gestor || '',
      'regimeContratacao': colaborador.regimeContratacao || ''
    };
    
    console.log('💾 Dados a inserir:', dataToInsert);
    
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .insert([dataToInsert])
      .select();
    
    if (error) {
      console.error('❌ Erro ao adicionar:', error);
      throw error;
    }
    
    console.log('✅ Colaborador adicionado com sucesso:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro em addColaborador:', error.message);
    throw error;
  }
}

// Atualizar colaborador
async function updateColaborador(id, updates) {
  try {
    if (!supabase) {
      supabase = await initSupabase();
    }
    
    console.log('✏️ Atualizando colaborador:', { id, updates });
    
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Erro ao atualizar:', error);
      throw error;
    }
    
    console.log('✅ Colaborador atualizado:', data);
    return data;
  } catch (error) {
    console.error('❌ Erro em updateColaborador:', error.message);
    throw error;
  }
}

// Deletar colaborador
async function deleteColaborador(id) {
  try {
    if (!supabase) {
      supabase = await initSupabase();
    }
    
    console.log('🗑️ Deletando colaborador ID:', id);
    
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Erro ao deletar:', error);
      throw error;
    }
    
    console.log('✅ Colaborador deletado');
    return data;
  } catch (error) {
    console.error('❌ Erro em deleteColaborador:', error.message);
    throw error;
  }
}

// Buscar colaborador por ID
async function fetchColaboradorById(id) {
  try {
    if (!supabase) {
      supabase = await initSupabase();
    }
    
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Erro ao buscar por ID:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Erro em fetchColaboradorById:', error.message);
    return null;
  }
}

// Buscar colaboradores por gestor
async function fetchColaboradoresByGestor(gestorId) {
  try {
    if (!supabase) {
      supabase = await initSupabase();
    }
    
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select('*')
      .eq('gestor', gestorId);
    
    if (error) {
      console.error('❌ Erro ao buscar por gestor:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Erro em fetchColaboradoresByGestor:', error.message);
    return [];
  }
}

// Exportar para window (acessível globalmente)
window.initSupabase = initSupabase;
window.fetchColaboradores = fetchColaboradores;
window.addColaborador = addColaborador;
window.updateColaborador = updateColaborador;
window.deleteColaborador = deleteColaborador;
window.fetchColaboradorById = fetchColaboradorById;
window.fetchColaboradoresByGestor = fetchColaboradoresByGestor;

console.log('✅ supabaseClient.js carregado com sucesso!');
