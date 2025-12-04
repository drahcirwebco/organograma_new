// Script para importar dados de CSV para Supabase
// Uso: node import-csv-to-supabase.js <arquivo.csv>

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const csv = require('csv-parse');

const SUPABASE_URL = 'https://pyinmcinjcyelavkuhfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aW5tY2luamN5ZWxhdmt1aGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2ODA0NDIsImV4cCI6MjA2MzI1NjQ0Mn0.5UbxNTluLWoy56tBLL6tAAZZwLMj17uUDR8_nd9IMWA';
const TABLE_NAME = 'tabela_organograma';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
});

async function readCSV(filePath) {
    return new Promise((resolve, reject) => {
        const results = [];
        const parser = csv.parse({
            columns: true,
            trim: true,
            skip_empty_lines: true
        });

        fs.createReadStream(filePath)
            .pipe(parser)
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

function mapCSVToSupabase(csvRow) {
    // Mapear colunas do CSV para o formato Supabase
    // Ajuste conforme necessário de acordo com seu CSV
    return {
        nome: csvRow.Nome || csvRow.Colaborador || csvRow.nome || '',
        cargo: csvRow.Cargo || csvRow.cargo || '',
        departamento: csvRow.Departamento || csvRow.departamento || '',
        gestor: csvRow['Superior Imediato'] || csvRow.Gestor || csvRow.gestor || '',
        area: csvRow.Área || csvRow.Area || csvRow.area || '',
        regimeContratacao: csvRow.Regime || csvRow.regimeContratacao || csvRow['Regime Contratação'] || 'CLT',
        telefone: csvRow.Telefone || csvRow.telefone || '',
        observacao: csvRow.Observacao || csvRow.observacao || ''
    };
}

async function importCSV(filePath) {
    try {
        // Verificar se arquivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado: ${filePath}`);
        }

        console.log(`📂 Lendo arquivo: ${filePath}`);
        const dados = await readCSV(filePath);
        
        if (dados.length === 0) {
            throw new Error('CSV vazio');
        }

        console.log(`📋 ${dados.length} registros encontrados no CSV`);
        
        // Mapear dados
        const dadosMapeados = dados.map(mapCSVToSupabase);
        
        // Validar dados
        const dadosValidos = dadosMapeados.filter(d => d.nome && d.nome.trim());
        
        if (dadosValidos.length === 0) {
            throw new Error('Nenhum registro válido encontrado');
        }

        console.log(`✅ ${dadosValidos.length} registros válidos para importar`);
        
        // Inserir em lotes (Supabase recomenda lotes de até 1000)
        const tamanhoLote = 100;
        let totalInserido = 0;
        let totalErros = 0;

        for (let i = 0; i < dadosValidos.length; i += tamanhoLote) {
            const lote = dadosValidos.slice(i, i + tamanhoLote);
            
            try {
                const { data, error } = await supabase
                    .from(TABLE_NAME)
                    .insert(lote)
                    .select();
                
                if (error) {
                    console.error(`❌ Erro no lote ${Math.floor(i / tamanhoLote) + 1}:`, error.message);
                    totalErros += lote.length;
                } else {
                    totalInserido += data.length;
                    console.log(`✅ Lote ${Math.floor(i / tamanhoLote) + 1} inserido: ${data.length} registros`);
                }
            } catch (err) {
                console.error(`❌ Erro ao inserir lote:`, err.message);
                totalErros += lote.length;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 RELATÓRIO DE IMPORTAÇÃO');
        console.log('='.repeat(50));
        console.log(`✅ Registros inseridos: ${totalInserido}`);
        console.log(`❌ Registros com erro: ${totalErros}`);
        console.log(`📝 Total processado: ${totalInserido + totalErros}/${dadosValidos.length}`);
        console.log('='.repeat(50));
        
        return { totalInserido, totalErros };

    } catch (error) {
        console.error('❌ Erro na importação:', error.message);
        process.exit(1);
    }
}

// Obter arquivo do argumento da linha de comando
const caminhoArquivo = process.argv[2];

if (!caminhoArquivo) {
    console.log('Uso: node import-csv-to-supabase.js <arquivo.csv>');
    console.log('\nExemplos:');
    console.log('  node import-csv-to-supabase.js base_atualizada_colaboradores.csv');
    console.log('  node import-csv-to-supabase.js dados.csv');
    process.exit(1);
}

// Executar importação
importCSV(caminhoArquivo);
