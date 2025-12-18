// Importar funções do supabaseClient
import { 
    initSupabase, 
    fetchColaboradores, 
    addColaborador, 
    updateColaborador, 
    deleteColaborador 
} from './supabaseClient.js';

// Variáveis globais
let colaboradoresData = [];
let currentHierarchyLevel = 'presidencia';
let currentSelectedPerson = null;
let navigationHistory = [];
let dataLoaded = false;
let currentRegimeFilter = 'Todos'; // Nova variável para armazenar o filtro de regime

// ----------------- HELPERS DE NORMALIZAÇÃO -----------------
function getNome(col) {
    if (!col) return '';
    return (col.Colaborador || col.Nome || col['Nome do Colaborador'] || '').trim();
}
function getCargo(col) {
    if (!col) return '';
    return (col.Cargo || '').trim();
}
function getGestor(col) {
    if (!col) return '';
    return (col.Gestor || '').trim();
}
function getArea(col) {
    if (!col) return '';
    // Usa apenas 'Área' com variações do Supabase
    return (col['Área'] || col.Area || col.area || '').trim();
}
function isDiretor(col) {
    const cargo = getCargo(col).toLowerCase();
    return cargo.includes('diretor') || cargo.includes('diretora');
}

// Nota: Supabase gera IDs automaticamente (UUID)
// Esta função é mantida apenas para compatibilidade com código legado
function buildDocId(nome) {
    // Esta função é depreciada - Supabase gera IDs automaticamente
    return nome.toLowerCase()
        .replace(/[áàâãä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòôõö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Função para obter regime do colaborador
function getRegime(col) {
    if (!col) return '';
    return (col.regimeContratacao || col.Regime || col.regime || '').trim();
}

// Função para filtrar colaboradores pelo regime selecionado
function filterColaboradoresByRegime(colaboradores, regime) {
    if (regime === 'Todos' || !regime) {
        return colaboradores;
    }
    return colaboradores.filter(col => {
        const colRegime = getRegime(col).toUpperCase();
        return colRegime === regime.toUpperCase();
    });
}

// ====== INICIALIZAÇÃO SUPABASE ======
async function initSupabaseConnection() {
    try {
        console.log('🔧 Inicializando Supabase...');
        
        // Garantir que window.initSupabase está disponível
        if (!window.initSupabase) {
            throw new Error('window.initSupabase não está disponível');
        }
        
        const db = await window.initSupabase();
        if (!db) {
            throw new Error('Falha ao inicializar Supabase');
        }
        console.log('✅ Supabase inicializado com sucesso!');
        
        // Carregar dados imediatamente
        console.log('🚀 Carregando dados do Supabase...');
        await loadSupabaseData();
        
    } catch (error) {
        console.error('❌ Erro na inicialização do Supabase:', error);
        console.log('⚠️ Tentando carregar dados locais como fallback...');
        await loadInitialData();
    }
}

// Carregar dados do Supabase
async function loadSupabaseData() {
    try {
        console.log('📥 Buscando colaboradores do Supabase...');
        
        // Garantir que window.fetchColaboradores está disponível
        if (!window.fetchColaboradores) {
            throw new Error('window.fetchColaboradores não está disponível');
        }
        
        console.log('✅ window.fetchColaboradores disponível');
        
        // Chamar com timeout de 10 segundos
        const data = await Promise.race([
            window.fetchColaboradores(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao buscar dados (10s)')), 10000))
        ]);
        
        console.log('📊 Dados brutos do Supabase:', data);
        console.log('📊 Primeiro item:', data ? data[0] : 'VAZIO');
        
        if (!data || data.length === 0) {
            console.warn('⚠️ Nenhum dado retornado do Supabase');
            return;
        }
        
        // Mapear dados do Supabase para o formato esperado
        colaboradoresData = data.map(item => ({
            Colaborador: item.Colaborador || item.nome || item.Nome || '',
            Nome: item.Colaborador || item.nome || item.Nome || '',
            Cargo: item.Cargo || item.cargo || '',
            Departamento: item.Departamento || item.departamento || item['Área'] || item.area || item.Area || '',
            Gestor: item.Gestor || item.gestor || '',
            Área: item['Área'] || item.Area || item.area || item.Departamento || item.departamento || '',
            Area: item['Área'] || item.Area || item.area || item.Departamento || item.departamento || '',
            Regime: item.Regime || item.regimeContratacao || item['regimeContratacao'] || '',
            regimeContratacao: item.Regime || item.regimeContratacao || item['regimeContratacao'] || '',
            Telefone: item.Telefone || item.telefone || '',
            telefone: item.Telefone || item.telefone || '',
            Observacao: item.Observacao || item.observacao || '',
            observacao: item.Observacao || item.observacao || '',
            id: item.id,
            created_at: item.created_at
        }));
        
        console.log('✅ Dados mapeados:', colaboradoresData.length, 'colaboradores');
        console.log('✅ Primeiro colaborador mapeado:', colaboradoresData[0]);
        dataLoaded = true;
        console.log(`✅ ${colaboradoresData.length} colaboradores carregados do Supabase!`);
        
        // Renderizar view inicial
        console.log('🎨 Renderizando Presidência View...');
        renderPresidenciaView();
        console.log('✅ Renderização completa!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do Supabase:', error);
        console.log('⚠️ Tentando carregar fallback local...');
    }
}

// Modal Add Colaborador refs
let addModal, addForm, btnAddColaborador, btnCancelAdd;
let selectDepartamento, selectGestor;

// Modal Edit Colaborador refs
let editModal, editForm, btnCancelEdit;
let editSelectDepartamento, editSelectGestor;

// Modal Reassign refs
let reassignModal, btnCancelReassign, btnConfirmReassign;
let newManagerSelect, subordinatesList;

function setupAddColaboradorModal() {
    addModal = document.getElementById('add-colaborador-modal');
    addForm = document.getElementById('add-colaborador-form');
    btnAddColaborador = document.getElementById('btn-add-colaborador');
    btnCancelAdd = document.getElementById('btn-cancel-add');
    selectDepartamento = document.getElementById('colaborador-departamento');
    selectGestor = document.getElementById('colaborador-gestor');

    if (!addModal || !addForm || !btnAddColaborador) return;

    // Elementos de novo setor
    const checkboxNovoSetor = document.getElementById('checkbox-novo-setor');
    const divNovoSetor = document.getElementById('div-novo-setor');
    const inputNovoSetor = document.getElementById('input-novo-setor');

    // Mostrar/esconder input de novo setor e resetar dropdown
    if (checkboxNovoSetor) {
        checkboxNovoSetor.addEventListener('change', function() {
            if (this.checked) {
                divNovoSetor.style.display = 'block';
                selectDepartamento.value = ''; // Resetar dropdown
                selectDepartamento.removeAttribute('required');
                inputNovoSetor.focus();
            } else {
                divNovoSetor.style.display = 'none';
                selectDepartamento.setAttribute('required', 'required');
                inputNovoSetor.value = '';
            }
        });
        
        // Desmarcar checkbox quando mexer no dropdown
        selectDepartamento.addEventListener('change', function() {
            if (this.value !== '') {
                checkboxNovoSetor.checked = false;
                divNovoSetor.style.display = 'none';
                inputNovoSetor.value = '';
                selectDepartamento.setAttribute('required', 'required');
            }
        });
    }

    btnAddColaborador.addEventListener('click', () => {
        populateDepartamentos();
        populateGestores();
        openAddModal();
    });

    btnCancelAdd && btnCancelAdd.addEventListener('click', closeAddModal);

    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Formulário de adicionar colaborador acionado');
        
        const nome = document.getElementById('colaborador-nome').value.trim();
        const cargo = document.getElementById('colaborador-cargo').value.trim();
        const departamento = selectDepartamento.value;
        const gestor = selectGestor.value;
        const regime = document.getElementById('colaborador-regime').value;
        
        // Verificar novo setor
        const isNovoSetor = checkboxNovoSetor.checked;
        const novoSetorNome = inputNovoSetor.value.trim();
        
        console.log('📋 Valores do formulário:', { nome, cargo, departamento, gestor, regime });
        console.log('🔍 Novo setor marcado?', isNovoSetor);
        console.log('📝 Nome do novo setor:', novoSetorNome);
        
        if (!nome || !cargo || !gestor || !regime) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        
        if (!departamento && !isNovoSetor) {
            alert('Selecione uma Área ou marque "Novo setor".');
            return;
        }
        
        if (isNovoSetor && !novoSetorNome) {
            alert('Digite o nome do novo setor.');
            return;
        }
        
        // Se é novo setor, usar o nome digitado; caso contrário, usar o selecionado
        const areaFinal = isNovoSetor ? novoSetorNome : departamento;
        
        // Objeto para salvar no banco de dados
        const novo = { 
            Colaborador: nome, 
            Cargo: cargo, 
            'Área': areaFinal, 
            Gestor: gestor, 
            regimeContratacao: regime 
        };
        console.log('💾 Objeto a salvar:', novo);
        
        try {
            // Tentar adicionar no Supabase
            const addColaboradorFn = window.addColaborador;
            console.log('🔍 Função addColaborador disponível?', !!addColaboradorFn);
            
            if (addColaboradorFn) {
                try {
                    console.log('⏳ Enviando para Supabase...');
                    const resultado = await addColaboradorFn(novo);
                    console.log('✅ Colaborador adicionado ao Supabase:', resultado);
                    novo.id = resultado?.[0]?.id;
                } catch (err) {
                    console.error('❌ Erro ao adicionar ao Supabase:', err.message, err);
                    throw err;
                }
            } else {
                console.warn('⚠️ Função addColaborador não encontrada');
            }
            
            // Atualiza array local
            colaboradoresData.push(novo);
            
            // Se foi novo setor, adicionar à lista de setores
            if (isNovoSetor && novoSetorNome) {
                console.log('➕ Adicionando novo setor à lista:', novoSetorNome);
                adicionarSetorALista(novoSetorNome);
            }
            
            // Limpar formulário
            addForm.reset();
            checkboxNovoSetor.checked = false;
            divNovoSetor.style.display = 'none';
            inputNovoSetor.value = '';
            selectDepartamento.setAttribute('required', 'required');
            
            closeAddModal();
            
            // Re-renderiza a view atual
            if (!currentSelectedPerson) {
                renderPresidenciaView();
            } else {
                renderHierarchyLevel(currentSelectedPerson, currentHierarchyLevel);
            }
            alert('Colaborador adicionado com sucesso!');
        } catch(err) {
            console.error('❌ Erro geral ao adicionar colaborador:', err);
            alert('Erro ao salvar. Verifique o console.');
        }
    });

    // Fechar ao clicar fora
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) closeAddModal();
    });
}

function openAddModal() {
    addModal.classList.remove('hidden');
}
function closeAddModal() {
    addModal.classList.add('hidden');
    addForm.reset();
}

// ================== MODAL EDITAR COLABORADOR ==================
function setupEditColaboradorModal() {
    console.log('🔧 Configurando modal de edição...');
    
    editModal = document.getElementById('edit-colaborador-modal');
    editForm = document.getElementById('edit-colaborador-form');
    btnCancelEdit = document.getElementById('btn-cancel-edit');
    const btnDeleteColaborador = document.getElementById('btn-delete-colaborador');
    const editSelectArea = document.getElementById('edit-colaborador-area');
    const editSelectCargo = document.getElementById('edit-colaborador-cargo');

    console.log('🔍 Elementos encontrados:', {
        editModal: !!editModal,
        editForm: !!editForm,
        btnCancelEdit: !!btnCancelEdit,
        btnDeleteColaborador: !!btnDeleteColaborador,
        editSelectArea: !!editSelectArea,
        editSelectCargo: !!editSelectCargo
    });

    if (!editModal || !editForm) {
        console.error('❌ Modal de edição ou formulário não encontrado!');
        return;
    }

    // Event listeners
    btnCancelEdit && btnCancelEdit.addEventListener('click', closeEditModal);
    
    btnDeleteColaborador && btnDeleteColaborador.addEventListener('click', (e) => {
        e.preventDefault();
        const originalName = document.getElementById('edit-colaborador-original-name').value;
        const colaborador = colaboradoresData.find(col => 
            getNome(col).toLowerCase() === originalName.toLowerCase()
        );
        if (colaborador) {
            closeEditModal();
            handleDeleteColaborador(colaborador);
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalName = document.getElementById('edit-colaborador-original-name').value;
        const nome = document.getElementById('edit-colaborador-nome').value.trim();
        const area = document.getElementById('edit-colaborador-area').value;
        const cargo = document.getElementById('edit-colaborador-cargo').value;
        
        if (!nome || !area || !cargo) {
            alert('Preencha todos os campos.');
            return;
        }

        // Encontrar o gestor baseado na área selecionada
        const gestor = findGestorByArea(area);
        
        const dadosAtualizados = { 
            Colaborador: nome, 
            Cargo: cargo, 
            'Área': area, 
            Gestor: gestor || 'Roger Ricardo Bueno Pinto' // fallback para presidente
        };

        try {
            // Tentar atualizar no Supabase
            const atualizarColaborador = window.updateColaborador;
            const originalColaborador = colaboradoresData.find(col => 
                getNome(col).toLowerCase() === originalName.toLowerCase()
            );
            
            if (atualizarColaborador && originalColaborador?.id) {
                try {
                    await atualizarColaborador(originalColaborador.id, dadosAtualizados);
                    console.log('✅ Colaborador atualizado no Supabase');
                } catch (err) {
                    console.warn('⚠️ Erro ao atualizar no Supabase (continuando com local):', err);
                }
            }

            // Atualizar array local
            const index = colaboradoresData.findIndex(col => 
                getNome(col).toLowerCase() === originalName.toLowerCase()
            );
            if (index !== -1) {
                colaboradoresData[index] = { ...dadosAtualizados, id: originalColaborador?.id };
            }

            // Atualizar gestores de subordinados se o nome mudou
            if (originalName !== nome) {
                colaboradoresData.forEach(col => {
                    if (getGestor(col).toLowerCase() === originalName.toLowerCase()) {
                        col.Gestor = nome;
                    }
                });
                
                // Atualizar também no Supabase
                const subordinados = colaboradoresData.filter(col => 
                    getGestor(col).toLowerCase() === nome.toLowerCase()
                );
                for (const sub of subordinados) {
                    if (sub.id) {
                        try {
                            await window.updateColaborador(sub.id, sub);
                        } catch (err) {
                            console.warn('⚠️ Erro ao atualizar subordinado no Supabase:', err);
                        }
                    }
                }
            }

            closeEditModal();
            // Re-renderizar a view atual
            if (!currentSelectedPerson) {
                renderPresidenciaView();
            } else {
                renderHierarchyLevel(currentSelectedPerson, currentHierarchyLevel);
            }
            
            alert('Colaborador atualizado com sucesso!');
        } catch(err) {
            console.error('❌ Erro ao atualizar colaborador:', err);
            alert('Erro ao atualizar. Verifique o console.');
        }
    });

    // Fechar ao clicar fora
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeEditModal();
    });
}

// Função de teste para debug
function testEditModal(colaborador) {
    const modal = document.getElementById('edit-colaborador-modal');
    console.log('🔍 Modal encontrado:', !!modal);
    
    if (modal) {
        modal.classList.remove('hidden');
        console.log('✅ Modal aberto!');
    } else {
        alert('❌ Modal não encontrado!');
    }
}

// Nova função de editar sem caracteres especiais
function editColaboradorModal(colaborador) {
    console.log('Nova funcao de editar executada');
    
    // Buscar o modal
    const modal = document.getElementById('edit-colaborador-modal');
    console.log('Modal encontrado:', !!modal);
    
    if (!modal) {
        alert('Erro: Modal nao encontrado!');
        return;
    }
    
    // Buscar campos do formulario
    const originalNameField = document.getElementById('edit-colaborador-original-name');
    const nomeField = document.getElementById('edit-colaborador-nome');
    const areaField = document.getElementById('edit-colaborador-area');
    const cargoField = document.getElementById('edit-colaborador-cargo');
    
    console.log('Campos encontrados:', { 
        originalNameField: !!originalNameField, 
        nomeField: !!nomeField, 
        areaField: !!areaField, 
        cargoField: !!cargoField 
    });
    
    if (!originalNameField || !nomeField || !areaField || !cargoField) {
        alert('Erro: Campos do formulario nao encontrados!');
        return;
    }
    
    // Preencher campos
    originalNameField.value = getNome(colaborador);
    nomeField.value = getNome(colaborador);
    
    // Popular selects
    populateEditAreas();
    populateEditCargos();
    
    // Selecionar valores atuais
    setTimeout(() => {
        if (areaField) {
            areaField.value = getArea(colaborador);
        }
        if (cargoField) {
            cargoField.value = getCargo(colaborador);
        }
    }, 100);
    
    // Abrir modal
    modal.classList.remove('hidden');
    console.log('Modal aberto com sucesso!');
}

function openEditModal(colaborador) {
    console.log('� FUNÇÃO openEditModal EXECUTADA!');
    console.log('🎨 Colaborador a ser editado:', getNome(colaborador));
    console.log('🔍 editModal elemento:', editModal);
    
    // Forçar re-busca do elemento se não foi encontrado
    if (!editModal) {
        editModal = document.getElementById('edit-colaborador-modal');
        console.log('🔄 Re-buscando editModal:', editModal);
    }
    
    if (!editModal) {
        console.error('❌ editModal AINDA não encontrado!');
        alert('Erro: Modal de edição não encontrado. Verifique o HTML.');
        return;
    }
    
    const originalNameField = document.getElementById('edit-colaborador-original-name');
    const nomeField = document.getElementById('edit-colaborador-nome');
    const areaField = document.getElementById('edit-colaborador-area');
    const cargoField = document.getElementById('edit-colaborador-cargo');
    
    console.log('🔍 Campos encontrados:', { 
        originalNameField: !!originalNameField, 
        nomeField: !!nomeField, 
        areaField: !!areaField, 
        cargoField: !!cargoField 
    });
    
    if (!originalNameField || !nomeField || !areaField || !cargoField) {
        console.error('❌ Campos do formulário não encontrados!');
        console.log('🔍 Elementos reais:', { originalNameField, nomeField, areaField, cargoField });
        alert('Erro: Campos do formulário não encontrados. Verifique o HTML.');
        return;
    }
    
    try {
        originalNameField.value = getNome(colaborador);
        nomeField.value = getNome(colaborador);
        
        // Popular selects
        console.log('📋 Populando selects...');
        populateEditAreas();
        populateEditCargos();
        
        // Selecionar valores atuais
        setTimeout(() => {
            console.log('⏰ Selecionando valores atuais...');
            if (areaField) {
                areaField.value = getArea(colaborador);
                console.log('🏢 Área selecionada:', getArea(colaborador));
            }
            if (cargoField) {
                cargoField.value = getCargo(colaborador);
                console.log('💼 Cargo selecionado:', getCargo(colaborador));
            }
        }, 100);
        
        console.log('✅ Removendo classe hidden do modal...');
        editModal.classList.remove('hidden');
        console.log('✅ Modal deve estar visível agora!');
        
    } catch (error) {
        console.error('💥 Erro ao abrir modal:', error);
        alert('Erro ao abrir modal: ' + error.message);
    }
}

function closeEditModal() {
    editModal.classList.add('hidden');
    editForm.reset();
}

// ================== MODAL REATRIBUIR SUBORDINADOS ==================
function setupReassignModal() {
    reassignModal = document.getElementById('reassign-modal');
    btnCancelReassign = document.getElementById('btn-cancel-reassign');
    btnConfirmReassign = document.getElementById('btn-confirm-reassign');
    newManagerSelect = document.getElementById('new-manager-select');
    subordinatesList = document.getElementById('subordinates-list');

    if (!reassignModal) return;

    btnCancelReassign && btnCancelReassign.addEventListener('click', closeReassignModal);
    
    btnConfirmReassign && btnConfirmReassign.addEventListener('click', async () => {
        const newManager = newManagerSelect.value;
        if (!newManager) {
            alert('Selecione um novo gestor.');
            return;
        }
        
        await confirmReassignAndDelete(newManager);
    });

    // Fechar ao clicar fora
    reassignModal.addEventListener('click', (e) => {
        if (e.target === reassignModal) closeReassignModal();
    });
}

function closeReassignModal() {
    reassignModal.classList.add('hidden');
    newManagerSelect.innerHTML = '<option value="" disabled selected>Selecione o novo gestor</option>';
    subordinatesList.innerHTML = '';
}

// ================== FUNÇÕES DE EXCLUSÃO ==================

async function handleDeleteColaborador(colaborador) {
    try {
        const nome = getNome(colaborador);
        const id = colaborador.id;
        
        console.log('🗑️ INICIANDO EXCLUSÃO:', nome, 'ID:', id);
        
        // Excluir do Supabase se tiver ID
        if (id) {
            try {
                // Importar a função deleteColaborador do supabaseClient
                const { deleteColaborador: deleteFromSupabase } = window;
                if (deleteFromSupabase) {
                    await deleteFromSupabase(id);
                    console.log('✅ Colaborador excluído do Supabase com sucesso!');
                }
            } catch (err) {
                console.warn('⚠️ Erro ao excluir do Supabase (continuando com local):', err);
            }
        }
        
        // Excluir do array local
        const index = colaboradoresData.findIndex(col => 
            getNome(col).toLowerCase() === nome.toLowerCase()
        );
        
        console.log('🗑️ Índice no array local:', index);
        
        if (index !== -1) {
            colaboradoresData.splice(index, 1);
            console.log('✅ Colaborador removido do array local');
            console.log('🔄 Total de colaboradores restantes:', colaboradoresData.length);
        } else {
            console.warn('⚠️ Colaborador não encontrado no array local');
        }
        
        // Re-renderizar a view atual
        if (!currentSelectedPerson) {
            renderPresidenciaView();
        } else {
            renderHierarchyLevel(currentSelectedPerson, currentHierarchyLevel);
        }
        
        alert('Colaborador excluído com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao excluir colaborador:', err);
        console.error('❌ Stack trace:', err.stack);
        alert('Erro ao excluir. Verifique o console.');
    }
}

function populateDepartamentos() {
    if (!selectDepartamento) return;
    const valores = [...new Set(colaboradoresData.map(c => getArea(c)).filter(Boolean).sort((a,b)=> a.localeCompare(b)) )];
    // Limpa mantendo placeholder
    selectDepartamento.innerHTML = '<option value="" disabled selected>Selecione uma área</option>';
    valores.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep;
        opt.textContent = dep;
        selectDepartamento.appendChild(opt);
    });
}

function populateGestores() {
    if (!selectGestor) return;
    const gestoresSet = new Set();
    colaboradoresData.forEach(c => {
        const cargoLower = (c.Cargo||'').toLowerCase();
        if (cargoLower.includes('diretor') || cargoLower.includes('gerente') || cargoLower.includes('coordenador') || cargoLower.includes('supervisor') || cargoLower.includes('head') || cargoLower.includes('manager')) {
            const nome = c.Colaborador || '';
            if (nome) {
                gestoresSet.add(nome);
            }
        }
    });
    const list = Array.from(gestoresSet).sort((a,b)=> a.localeCompare(b));
    selectGestor.innerHTML = '<option value="" disabled selected>Selecione o superior imediato</option>';
    list.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        selectGestor.appendChild(opt);
    });
}

function populateEditDepartamentos() {
    if (!editSelectDepartamento) return;
    const valores = [...new Set(colaboradoresData.map(c => getArea(c)).filter(Boolean).sort((a,b)=> a.localeCompare(b)) )];
    editSelectDepartamento.innerHTML = '<option value="" disabled>Selecione uma área</option>';
    valores.forEach(dep => {
        const opt = document.createElement('option');
        opt.value = dep;
        opt.textContent = dep;
        editSelectDepartamento.appendChild(opt);
    });
}

function populateEditGestores() {
    if (!editSelectGestor) return;
    const gestoresSet = new Set();
    colaboradoresData.forEach(c => {
        const cargoLower = (c.Cargo||'').toLowerCase();
        if (cargoLower.includes('diretor') || cargoLower.includes('gerente') || cargoLower.includes('coordenador') || cargoLower.includes('supervisor') || cargoLower.includes('head') || cargoLower.includes('manager')) {
            const nome = c.Colaborador || '';
            if (nome) {
                gestoresSet.add(nome);
            }
        }
    });
    const list = Array.from(gestoresSet).sort((a,b)=> a.localeCompare(b));
    editSelectGestor.innerHTML = '<option value="" disabled>Selecione o superior imediato</option>';
    list.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        editSelectGestor.appendChild(opt);
    });
}

function populateEditAreas() {
    const areaField = document.getElementById('edit-colaborador-area');
    if (!areaField) return;
    
    const areas = [...new Set(colaboradoresData.map(c => getArea(c)).filter(Boolean).sort((a,b)=> a.localeCompare(b)))];
    areaField.innerHTML = '<option value="" disabled selected>Selecione uma área</option>';
    areas.forEach(area => {
        const opt = document.createElement('option');
        opt.value = area;
        opt.textContent = area;
        areaField.appendChild(opt);
    });
}

function populateEditCargos() {
    const cargoField = document.getElementById('edit-colaborador-cargo');
    if (!cargoField) return;
    
    const cargos = [...new Set(colaboradoresData.map(c => getCargo(c)).filter(Boolean).sort((a,b)=> a.localeCompare(b)))];
    cargoField.innerHTML = '<option value="" disabled selected>Selecione um cargo</option>';
    cargos.forEach(cargo => {
        const opt = document.createElement('option');
        opt.value = cargo;
        opt.textContent = cargo;
        cargoField.appendChild(opt);
    });
}

function findGestorByArea(area) {
    // Encontra o gestor responsável pela área
    const gestoresNaArea = colaboradoresData.filter(c => {
        const areaCol = getArea(c);
        const cargoLower = getCargo(c).toLowerCase();
        return areaCol === area && (
            cargoLower.includes('diretor') || 
            cargoLower.includes('gerente') || 
            cargoLower.includes('coordenador') ||
            cargoLower.includes('head')
        );
    });
    
    // Retorna o primeiro gestor encontrado na área, ou o presidente como fallback
    return gestoresNaArea.length > 0 ? getNome(gestoresNaArea[0]) : 'Roger Ricardo Bueno Pinto';
}

function populateNewManagerSelect(excludeName) {
    if (!newManagerSelect) return;
    const gestoresSet = new Set();
    colaboradoresData.forEach(c => {
        const cargoLower = (c.Cargo||'').toLowerCase();
        if (cargoLower.includes('diretor') || cargoLower.includes('gerente') || cargoLower.includes('coordenador') || cargoLower.includes('supervisor') || cargoLower.includes('head') || cargoLower.includes('manager')) {
            const nome = c.Colaborador || '';
            if (nome && excludeName && nome.toLowerCase() !== excludeName.toLowerCase()) {
                gestoresSet.add(nome);
            }
        }
    });
    const list = Array.from(gestoresSet).sort((a,b)=> a.localeCompare(b));
    newManagerSelect.innerHTML = '<option value="" disabled selected>Selecione o novo gestor</option>';
    list.forEach(nome => {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        newManagerSelect.appendChild(opt);
    });
}


// Carregar dados iniciais
// REMOVIDO: loadFirebaseData foi substituído por loadSupabaseData
// Supabase é agora a fonte única de verdade para os dados

async function loadInitialData() {
    try {
        if (dataLoaded) { 
            console.log('ℹ️ Dados já foram carregados');
            return; 
        }
        console.log('📊 Carregando dados iniciais...');
        
        // Tentar carregar do Supabase primeiro
        await loadSupabaseData();
        
        if (!dataLoaded) {
            console.warn('⚠️ Não foi possível carregar do Supabase. Carregando fallback local...');
            await loadFromLocalJson();
            
            // Renderizar view apenas após carregar dados
            if (colaboradoresData && colaboradoresData.length > 0) {
                console.log('✅ Dados carregados do arquivo local. Renderizando...');
                renderPresidenciaView();
                dataLoaded = true;
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        console.error('Stack:', error.stack);
        // Tentar fallback local como último recurso
        try {
            await loadFromLocalJson();
            if (colaboradoresData && colaboradoresData.length > 0) {
                console.log('✅ Fallback local funcionou. Renderizando...');
                renderPresidenciaView();
                dataLoaded = true;
            }
        } catch (fallbackError) {
            console.error('❌ Até o fallback local falhou:', fallbackError);
            setErrorState('Erro ao carregar dados: ' + error.message);
        }
    }
}

async function loadFromLocalJson() {
    console.log('📁 Carregando output.json...');
    const response = await fetch('output.json', { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Falha ao carregar output.json');
    }
    colaboradoresData = await response.json();
    console.log(`✅ ${colaboradoresData.length} colaboradores carregados do arquivo local`);
}






// Renderizar view da presidência
function renderPresidenciaView() {
    console.log('🎯 Renderizando view da presidência');
    
    const container = document.getElementById('chart-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    const title = document.createElement('h2');
    title.textContent = 'Presidência';
    title.style.cssText = `
        text-align: center;
        margin: 0 0 40px 0;
        font-size: 32px;
        font-weight: 700;
        color: #1e40af;
    `;
    container.appendChild(title);
    
    // Ajustar estado base da hierarquia
    currentHierarchyLevel = 'presidencia';

    // Aplicar filtro de regime
    const colaboradoresFiltrados = filterColaboradoresByRegime(colaboradoresData, currentRegimeFilter);

    // Buscar presidente de forma segura
    const presidente = colaboradoresFiltrados.find(col => getCargo(col).toLowerCase().includes('presidente')) || null;

    // Derivar diretores: primeiro todos, depois filtrar diretos
    const todosDiretores = colaboradoresFiltrados.filter(isDiretor);
    let diretores = todosDiretores;
    if (presidente) {
        const nomePresidente = getNome(presidente).toLowerCase();
        const diretos = todosDiretores.filter(d => getGestor(d).toLowerCase() === nomePresidente);
        if (diretos.length > 0) diretores = diretos;
        console.log(`👔 Diretores total: ${todosDiretores.length} | Diretos: ${diretos.length} | Exibindo: ${diretores.length}`);
    } else {
        console.warn('⚠️ Presidente não encontrado. Exibindo todos os diretores.');
    }
    
    // Definir currentSelectedPerson para facilitar histórico na primeira navegação
    if (presidente) {
        currentSelectedPerson = presidente;
    } else {
        currentSelectedPerson = null;
    }

    // Card da Presidente (se encontrada)
    if (presidente) {
                        const presidenteContainer = document.createElement('div');
                presidenteContainer.style.cssText = `
                    display: flex;
                    justify-content: center;
                    margin-bottom: 30px;
                `;
        
                            const presidenteCard = document.createElement('div');
                    presidenteCard.style.cssText = `
                        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
                        color: white;
                        border-radius: 20px;
                        padding: 20px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 8px 30px rgba(96, 165, 250, 0.4);
                        max-width: 300px;
                        width: 100%;
                    `;
        
        const presidenteNome = document.createElement('h3');
    presidenteNome.textContent = getNome(presidente) || 'Presidente';
        presidenteNome.style.cssText = `
            font-size: 18px;
            font-weight: 700;
            margin: 0 0 8px 0;
        `;
        
        const presidenteCargo = document.createElement('p');
    presidenteCargo.textContent = getCargo(presidente) || 'PRESIDENTE';
        presidenteCargo.style.cssText = `
            font-size: 14px;
            font-weight: 600;
            margin: 0 0 6px 0;
            opacity: 0.95;
        `;
        
        const presidenteDept = document.createElement('p');
    presidenteDept.textContent = getArea(presidente) || 'PRESIDENCIA';
        presidenteDept.style.cssText = `
            font-size: 12px;
            opacity: 0.9;
            margin: 0;
        `;
        
        presidenteCard.appendChild(presidenteNome);
        presidenteCard.appendChild(presidenteCargo);
        presidenteCard.appendChild(presidenteDept);
        
        // Adicionar eventos de hover e clique
        presidenteCard.addEventListener('mouseenter', () => {
            presidenteCard.style.transform = 'translateY(-5px)';
            presidenteCard.style.boxShadow = '0 12px 35px rgba(96, 165, 250, 0.5)';
        });
        
        presidenteCard.addEventListener('mouseleave', () => {
            presidenteCard.style.transform = 'translateY(0)';
            presidenteCard.style.boxShadow = '0 8px 30px rgba(96, 165, 250, 0.4)';
        });
        
        presidenteCard.addEventListener('click', (e) => {
            // Verificar se o clique foi em um botão de ação ou seus filhos
            if (e.target.closest('.action-btn') || e.target.closest('.card-actions')) {
                console.log('🚫 Clique em botão de ação detectado no card do presidente - cancelando navegação');
                return; // Não navega se clicou em botão de ação
            }
            console.log('✅ Clique no card do presidente (fora dos botões) - navegando...');
            // Usar forma padronizada 'presidencia' para coerência com levelMap
            navigateToNextLevel(presidente, 'presidencia');
        });
        
        presidenteContainer.appendChild(presidenteCard);
        container.appendChild(presidenteContainer);
    }
    
    // Título dos diretores
    const diretoresTitle = document.createElement('h3');
    diretoresTitle.textContent = 'Diretores';
    diretoresTitle.style.cssText = `
        text-align: center;
        margin: 0 0 20px 0;
        font-size: 24px;
        font-weight: 600;
        color: #374151;
    `;
    container.appendChild(diretoresTitle);
    
    if (!Array.isArray(diretores) || diretores.length === 0) {
        const noData = document.createElement('p');
        noData.textContent = 'Nenhum diretor encontrado.';
        noData.style.cssText = `
            text-align: center;
            color: #64748b;
            font-size: 16px;
            margin-top: 30px;
        `;
        container.appendChild(noData);
        return;
    }

    // Lista branca fornecida pelo usuário
    const listaDiretoresPermitidos = new Set([
        'Diego Calabria',
        'Roger Ricardo Bueno Pinto',
        'Elifas Levi Rocha dos Santos',
        'Guilherme Ricciardi Correa Lopes',
        'Jairo Avritchir',
        'Jefferson dos Santos Melo',
        'Juliano Teles Andriguetti',
        'Vinicius Antoniazi Ungarato'
    ].map(n => n.toLowerCase()));

    const filtradosLista = diretores.filter(d => listaDiretoresPermitidos.has(getNome(d).toLowerCase()));
    if (filtradosLista.length > 0) {
        console.log(`📋 Aplicando filtro lista branca: ${filtradosLista.length}/${diretores.length}`);
        diretores = filtradosLista;
    } else {
        console.warn('⚠️ Lista branca não encontrou correspondências. Mantendo diretores calculados.');
    }
    
    // Container dos diretores em layout horizontal
    const diretoresContainer = document.createElement('div');
    diretoresContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 15px;
        padding: 10px 0;
        max-width: 100%;
        margin: 0 auto;
        justify-content: center;
    `;
    
    diretores.forEach(diretor => {
        const diretorCard = document.createElement('div');
        diretorCard.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 120px;
            flex: 1;
            min-width: 180px;
            max-width: 200px;
        `;
        
        const diretorNome = document.createElement('h3');
        diretorNome.textContent = diretor.Colaborador;
        diretorNome.style.cssText = `
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 6px 0;
            line-height: 1.2;
        `;
        
        const diretorCargo = document.createElement('p');
        diretorCargo.textContent = diretor.Cargo;
        diretorCargo.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            margin: 0 0 4px 0;
            opacity: 0.9;
            line-height: 1.3;
        `;
        
        const diretorDept = document.createElement('p');
    diretorDept.textContent = getArea(diretor);
        diretorDept.style.cssText = `
            font-size: 9px;
            opacity: 0.8;
            margin: 0;
            line-height: 1.2;
        `;
        
        diretorCard.appendChild(diretorNome);
        diretorCard.appendChild(diretorCargo);
        diretorCard.appendChild(diretorDept);
        
        // Adicionar eventos de hover e clique
        diretorCard.addEventListener('mouseenter', () => {
            diretorCard.style.transform = 'translateY(-3px)';
            diretorCard.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
        });
        
        diretorCard.addEventListener('mouseleave', () => {
            diretorCard.style.transform = 'translateY(0)';
            diretorCard.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
        });
        
        diretorCard.addEventListener('click', (e) => {
            // Verificar se o clique foi em um botão de ação ou seus filhos
            if (e.target.closest('.action-btn') || e.target.closest('.card-actions')) {
                console.log('🚫 Clique em botão de ação detectado no card do diretor - cancelando navegação');
                return; // Não navega se clicou em botão de ação
            }
            console.log('✅ Clique no card do diretor (fora dos botões) - navegando...');
            navigateToNextLevel(diretor, 'diretor');
        });
        
        diretoresContainer.appendChild(diretorCard);
    });
    
    // Renderizar vagas abertas (apenas 1 card se houver diretores faltando)
    const nomesPreenchidos = new Set(diretores.map(d => getNome(d).toLowerCase()));
    const vagasAbertas = Array.from(listaDiretoresPermitidos).filter(nome => !nomesPreenchidos.has(nome));
    
    if (vagasAbertas.length > 0) {
        // Criar apenas 1 card de vaga aberta (mesmo que haja múltiplas vagas)
        const vagaCard = document.createElement('div');
        vagaCard.style.cssText = `
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
            color: white;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: 120px;
            flex: 1;
            min-width: 180px;
            max-width: 200px;
        `;
        
        const vagaTitulo = document.createElement('h3');
        vagaTitulo.textContent = 'VAGA EM ABERTO';
        vagaTitulo.style.cssText = `
            font-size: 14px;
            font-weight: 700;
            margin: 0 0 6px 0;
            line-height: 1.2;
        `;
        
        const vagaCargo = document.createElement('p');
        vagaCargo.textContent = 'DIRETOR DE TECNOLOGIA E INOVAÇÃO';
        vagaCargo.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            margin: 0 0 4px 0;
            opacity: 0.9;
            line-height: 1.3;
        `;
        
        const vagaDept = document.createElement('p');
        vagaDept.textContent = 'Diretoria de TI';
        vagaDept.style.cssText = `
            font-size: 9px;
            opacity: 0.8;
            margin: 0;
            line-height: 1.2;
        `;
        
        vagaCard.appendChild(vagaTitulo);
        vagaCard.appendChild(vagaCargo);
        vagaCard.appendChild(vagaDept);
        
        // Adicionar eventos de hover (como um diretor real)
        vagaCard.addEventListener('mouseenter', () => {
            vagaCard.style.transform = 'translateY(-3px)';
            vagaCard.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
        });
        
        vagaCard.addEventListener('mouseleave', () => {
            vagaCard.style.transform = 'translateY(0)';
            vagaCard.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.3)';
        });
        
        // Criar um objeto fake para a vaga que possa ser navegado como um diretor
        const vagaObj = {
            Colaborador: 'VAGA EM ABERTO',
            Cargo: 'DIRETOR DE TECNOLOGIA E INOVAÇÃO',
            'Área': 'Diretoria de TI',
            Gestor: getNome(presidente) || 'Presidente', // A vaga pertence ao presidente
            id: 'vaga_diretor_' + Date.now(),
            isVaga: true // Flag para indicar que é uma vaga
        };
        
        // Clique na vaga para navegar como um diretor
        vagaCard.addEventListener('click', (e) => {
            if (e.target.closest('.action-btn') || e.target.closest('.card-actions')) {
                return;
            }
            console.log('✅ Clique na vaga em aberto (fora dos botões) - navegando...');
            navigateToNextLevel(vagaObj, 'diretor');
        });
        
        diretoresContainer.appendChild(vagaCard);
    }
    
    container.appendChild(diretoresContainer);
}

// Navegar para o próximo nível hierárquico
function navigateToNextLevel(person, currentLevel) {
    console.log('🎯 DEBUG navigateToNextLevel:', person.Colaborador, 'nível atual:', currentLevel);
    
    // Salvar estado atual no histórico
    if (currentSelectedPerson) {
        navigationHistory.push({
            person: currentSelectedPerson,
            level: currentHierarchyLevel
        });
    } else {
        console.log('ℹ️ Histórico não atualizado pois currentSelectedPerson ainda é null (nível raiz).');
    }
    
    console.log(`🎯 Estado atual: currentHierarchyLevel = ${currentHierarchyLevel}`);
    
    // Determinar próximo nível
    let nextLevel = getNextLevel(currentLevel);
    console.log('🎯 getNextLevel retornou:', nextLevel);
    
    if (nextLevel === 'auto') {
        nextLevel = detectNextLevel(person);
        console.log('🎯 detectNextLevel retornou:', nextLevel);
    }
    
    // Atualizar estado
    currentHierarchyLevel = nextLevel;
    currentSelectedPerson = person;
    console.log('🎯 Estado atualizado - currentHierarchyLevel:', currentHierarchyLevel);
    
    // Renderizar próximo nível usando o nível já atualizado (nextLevel)
    renderHierarchyLevel(person, currentHierarchyLevel);
}

// Determinar próximo nível baseado no nível atual
function getNextLevel(currentLevel) {
    console.log(`🎯 getNextLevel chamado com: ${currentLevel}`);
    const levelMap = {
        'presidencia': 'diretor',
    'presidente': 'diretor', // compatibilidade caso string antiga seja usada
        'diretor': 'auto', // Será determinado automaticamente
        'gerente': 'auto', // Será determinado automaticamente
        'coordenador': 'auto', // Será determinado automaticamente
        'supervisor': 'colaborador'
    };
    const result = levelMap[currentLevel] || 'colaborador';
    console.log(`🎯 getNextLevel retornando: ${result}`);
    return result;
}

// Detectar próximo nível dinamicamente
function detectNextLevel(person) {
    console.log('🔍 DEBUG detectNextLevel:', person.Colaborador);
    
    // Buscar todos os subordinados diretos
    const subordinados = colaboradoresData.filter(col => {
        const gestor = (col.Gestor || '').toLowerCase();
        const nomePessoa = person.Colaborador.toLowerCase();
        const match = gestor.includes(nomePessoa);
        console.log(`🔍 Comparando: "${gestor}" com "${nomePessoa}" = ${match}`);
        return match;
    });
    
    console.log('📊 Subordinados encontrados:', subordinados.length);
    subordinados.forEach((sub, i) => {
        console.log(`${i+1}. ${sub.Colaborador} - ${sub.Cargo} - Gestor: ${sub.Gestor}`);
    });
    
    if (subordinados.length === 0) {
        console.log('❌ Nenhum subordinado encontrado, retornando colaborador');
        return 'colaborador';
    }
    
    // Analisar cargos dos subordinados para determinar o próximo nível
    const cargos = subordinados.map(col => (col.Cargo || '').toLowerCase());
    console.log('🔍 Cargos dos subordinados:', cargos);
    
    // Verificar se há gerentes/heads
    const temGerentes = cargos.some(cargo => 
        cargo.includes('gerente') || 
        cargo.includes('head') || 
        cargo.includes('manager')
    );
    
    // Verificar se há coordenadores
    const temCoordenadores = cargos.some(cargo => 
        cargo.includes('coordenador') || 
        cargo.includes('coordinator')
    );
    
    // Verificar se há supervisores
    const temSupervisores = cargos.some(cargo => 
        cargo.includes('supervisor') || 
        cargo.includes('supervisora')
    );
    
    // Verificar se há diretores (caso raro, mas possível)
    const temDiretores = cargos.some(cargo => 
        cargo.includes('diretor') || 
        cargo.includes('diretora')
    );
    
    console.log('🔍 Análise de cargos:', {
        temDiretores,
        temGerentes,
        temCoordenadores,
        temSupervisores
    });
    
    // Seguir a hierarquia exata: Diretores > Gerentes > Coordenadores > Supervisores > Colaboradores
    if (temDiretores) {
        console.log('🎯 Retornando: diretor');
        return 'diretor';
    }
    if (temGerentes) {
        console.log('🎯 Retornando: gerente');
        return 'gerente';
    }
    if (temCoordenadores) {
        console.log('🎯 Retornando: coordenador');
        return 'coordenador';
    }
    if (temSupervisores) {
        console.log('🎯 Retornando: supervisor');
        return 'supervisor';
    }
    
    console.log('🎯 Retornando: colaborador (fallback)');
    return 'colaborador';
}

// Renderizar nível hierárquico
function renderHierarchyLevel(person, previousLevel) {
    // Guardas defensivos
    if (!person || !(person.Colaborador || person.Nome)) {
        console.warn('⚠️ Pessoa inválida em renderHierarchyLevel; voltando para visão da presidência.');
        return renderPresidenciaView();
    }
    console.log('🎯 DEBUG renderHierarchyLevel:', (person.Colaborador || person.Nome || '—'), 'nível:', currentHierarchyLevel);
    
    const container = document.getElementById('chart-container');
    if (!container) {
        console.error('❌ Container não encontrado!');
        return;
    }
    
    // Limpar container
    container.innerHTML = '';
    
    // Adicionar breadcrumb
    addBreadcrumb(container);
    
    // Usar função genérica para renderizar qualquer nível
    console.log('🎯 Chamando renderSubordinadosView com nível:', currentHierarchyLevel);
    renderSubordinadosView(person, currentHierarchyLevel);
}

// Função genérica para renderizar qualquer nível
function renderSubordinadosView(pessoa, nivelAtual) {
    console.log('🎯 DEBUG renderSubordinadosView:', (pessoa && (pessoa.Colaborador || pessoa.Nome)) || '—', 'nível:', nivelAtual);
    
    const container = document.getElementById('chart-container');
    if (!container) return;
    
    // Limpar conteúdo anterior
    container.innerHTML = '';
    
    // Adicionar breadcrumb com botão de voltar
    addBreadcrumb(container);
    
    // Aplicar filtro de regime
    const colaboradoresFiltrados = filterColaboradoresByRegime(colaboradoresData, currentRegimeFilter);
    
    // Buscar subordinados diretos
    const subordinados = colaboradoresFiltrados.filter(col => {
        const gestor = String(col && col.Gestor || '').toLowerCase();
        const nomePessoa = String((pessoa && (pessoa.Colaborador || pessoa.Nome)) || '').toLowerCase();
        return nomePessoa && gestor.includes(nomePessoa);
    });
    
    console.log(`📊 Subordinados encontrados: ${subordinados.length}`, subordinados);
    
    // Título genérico - mostrar todos os subordinados
    const title = document.createElement('h2');
    title.textContent = `Subordinados - ${(pessoa && (pessoa.Colaborador || pessoa.Nome)) || '—'}`;
    title.style.cssText = `
        text-align: center;
        margin: 0 0 30px 0;
        font-size: 28px;
        font-weight: 700;
        color: #1e40af;
    `;
    container.appendChild(title);
    
    // Card da pessoa atual (contexto)
    const pessoaCard = document.createElement('div');
    const cores = {
        'diretor': 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
        'gerente': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'coordenador': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'supervisor': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        'colaborador': 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'
    };
    
    pessoaCard.style.cssText = `
        background: ${cores[nivelAtual] || cores['colaborador']};
        color: white;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 30px;
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
    `;
    
    const pessoaNome = document.createElement('h3');
    pessoaNome.textContent = (pessoa && (pessoa.Colaborador || pessoa.Nome)) || '';
    pessoaNome.style.cssText = `
        font-size: 20px;
        font-weight: 700;
        margin: 0 0 8px 0;
    `;
    
    const pessoaCargo = document.createElement('p');
    pessoaCargo.textContent = pessoa.Cargo;
    pessoaCargo.style.cssText = `
        font-size: 14px;
        font-weight: 600;
        margin: 0;
        opacity: 0.9;
    `;
    
    pessoaCard.appendChild(pessoaNome);
    pessoaCard.appendChild(pessoaCargo);
    container.appendChild(pessoaCard);
    
    if (subordinados.length === 0) {
        const noData = document.createElement('p');
    noData.textContent = `Nenhum subordinado encontrado para ${(pessoa && (pessoa.Colaborador || pessoa.Nome)) || '—'}.`;
        noData.style.cssText = `
            text-align: center;
            color: #64748b;
            font-size: 16px;
            margin-top: 30px;
        `;
        container.appendChild(noData);
        return;
    }
    
    // Agrupar subordinados por tipo de cargo
    const diretores = subordinados.filter(col => {
        const cargo = (col.Cargo || '').toLowerCase();
        return cargo.includes('diretor') || cargo.includes('diretora');
    });
    
    const gerentes = subordinados.filter(col => {
        const cargo = (col.Cargo || '').toLowerCase();
        return cargo.includes('gerente') || cargo.includes('head') || cargo.includes('manager');
    });
    
    const coordenadores = subordinados.filter(col => {
        const cargo = (col.Cargo || '').toLowerCase();
        return cargo.includes('coordenador') || cargo.includes('coordinator');
    });
    
    const supervisores = subordinados.filter(col => {
        const cargo = (col.Cargo || '').toLowerCase();
        return cargo.includes('supervisor') || cargo.includes('supervisora');
    });
    
    const colaboradores = subordinados.filter(col => {
        const cargo = (col.Cargo || '').toLowerCase();
        return !cargo.includes('diretor') && 
               !cargo.includes('gerente') && 
               !cargo.includes('head') && 
               !cargo.includes('manager') &&
               !cargo.includes('coordenador') && 
               !cargo.includes('coordinator') &&
               !cargo.includes('supervisor') && 
               !cargo.includes('supervisora');
    });
    
    // Renderizar cada grupo em ordem hierárquica
    if (diretores.length > 0) {
        renderGrupoSubordinados(container, diretores, 'diretor', pessoa);
    }
    
    if (gerentes.length > 0) {
        renderGrupoSubordinados(container, gerentes, 'gerente', pessoa);
    }
    
    if (coordenadores.length > 0) {
        renderGrupoSubordinados(container, coordenadores, 'coordenador', pessoa);
    }
    
    if (supervisores.length > 0) {
        renderGrupoSubordinados(container, supervisores, 'supervisor', pessoa);
    }
    
    if (colaboradores.length > 0) {
        renderGrupoSubordinados(container, colaboradores, 'colaborador', pessoa);
    }
}

// Renderizar grupo de subordinados
function renderGrupoSubordinados(container, subordinados, tipo, gestor) {
    // --- Título do grupo ---
    const titulos = {
        'diretor': 'Diretores',
        'gerente': 'Gerentes',
        'coordenador': 'Coordenadores',
        'supervisor': 'Supervisores',
        'colaborador': 'Colaboradores'
    };

    const titulo = document.createElement('h3');
    titulo.textContent = titulos[tipo] || 'Grupo';
    titulo.style.cssText = `
        font-size: 20px;
        font-weight: 600;
        color: #374151;
        margin: 30px 0 15px 0;
        text-align: center;
    `;
    container.appendChild(titulo);

    // --- Container dos subordinados ---
    const subordinadosContainer = document.createElement('div');

    // Regras de layout horizontal
    const isGerente = tipo === 'gerente';
    const isCoordenador = tipo === 'coordenador';
    let aplicarHorizontal = false;

    if (isGerente) {
        aplicarHorizontal = true; // Gerentes sempre horizontais
    } else if (isCoordenador) {
        // Coordenadores só horizontais se não houver gerentes renderizados
        const jaTemGerentes = container.querySelector('.gerentes-section, .gerente-card');
        if (!jaTemGerentes) aplicarHorizontal = true;
    }

    if (aplicarHorizontal) {
        // Layout horizontal contínuo (mantido)
        subordinadosContainer.className = `${isGerente ? 'gerentes-section' : 'coordenadores-section'} horizontal-level`;
        subordinadosContainer.setAttribute('data-count', subordinados.length.toString());
    } else if (tipo === 'colaborador') {
        subordinadosContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px 0;
            justify-items: center;
            justify-content: center;
            max-width: 100%;
        `;
    } else if (tipo === 'supervisor') {
        subordinadosContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 20px 0;
            justify-items: center;
            max-width: 800px;
            margin: 0 auto;
        `;
    } else {
        // Gerentes / Coordenadores em layout responsivo quebrando linhas equilibradas
        const count = subordinados.length;
        let template = 'repeat(auto-fit, minmax(250px, 1fr))';
        
        // Caso especial para 1 item (centralizar)
        if (count === 1) {
            subordinadosContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 24px;
                padding: 24px 10px 30px 10px;
            `;
        }
        // Ajuste específico para 5 itens: 2 + 3 linhas centralizadas
        else if (count === 5) {
            // Usar grid com 3 colunas e centralizar primeira linha (2 itens)
            template = 'repeat(3, 1fr)';
            subordinadosContainer.style.cssText = `
                display: grid;
                grid-template-columns: ${template};
                gap: 24px 28px;
                padding: 28px 20px 30px 20px;
                max-width: 1100px;
                margin: 0 auto;
                justify-items: center;
                align-items: stretch;
            `;
        } else if (count === 4) {
            template = 'repeat(2, 1fr)';
            subordinadosContainer.style.cssText = `
                display: grid;
                grid-template-columns: ${template};
                gap: 28px;
                padding: 28px 10px 30px 10px;
                max-width: 900px;
                margin: 0 auto;
                justify-items: center;
            `;
        } else if (count <= 6) {
            // 3 colunas até 6 itens
            template = 'repeat(3, 1fr)';
            subordinadosContainer.style.cssText = `
                display: grid;
                grid-template-columns: ${template};
                gap: 24px 28px;
                padding: 24px 10px 30px 10px;
                max-width: 1200px;
                margin: 0 auto;
                justify-items: center;
            `;
        } else if (count === 7) {
            // 7: 4 + 3
            template = 'repeat(4, 1fr)';
            subordinadosContainer.style.cssText = `
                display: grid;
                grid-template-columns: ${template};
                gap: 22px 26px;
                padding: 26px 12px 32px 12px;
                max-width: 1400px;
                margin: 0 auto;
                justify-items: center;
            `;
        } else {
            subordinadosContainer.style.cssText = `
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 22px 26px;
                padding: 24px 0 30px 0;
                max-width: 1400px;
                margin: 0 auto;
                justify-items: center;
            `;
        }
    }

    // --- Renderização dos cards ---
    subordinados.forEach(sub => {
        // Mapear estilo para diretor (usa estilo de gerente se não houver caso específico)
        const tipoCard = (sub.Cargo || '').toLowerCase().includes('diretor') && tipo === 'diretor' ? 'gerente' : tipo;
        const card = createColaboradorCard(sub, tipoCard);
        card.classList.add(`${tipo}-card`);

        // Clique para navegar - só se não foi clicado em botão de ação
        card.addEventListener('click', (e) => {
            // Verificar se o clique foi em um botão de ação ou seus filhos
            if (e.target.closest('.action-btn') || e.target.closest('.card-actions')) {
                console.log('🚫 Clique em botão de ação detectado - cancelando navegação');
                return; // Não navega se clicou em botão de ação
            }
            console.log('✅ Clique no card (fora dos botões) - navegando...');
            navigateToNextLevel(sub, tipo);
        });

        subordinadosContainer.appendChild(card);
    });

    container.appendChild(subordinadosContainer);
}

// Criar card de colaborador
function createColaboradorCard(colaborador, tipo) {
    const nome = (colaborador.Colaborador || colaborador.Nome || colaborador['Nome do Colaborador'] || '').trim();
    const cargo = (colaborador.Cargo || '').trim();
    const departamento = getArea(colaborador);
    
    const card = document.createElement('div');
    card.className = `colaborador-card ${tipo}-card`;
    
    // Definir estilos baseados no tipo
    let cardStyles, nomeStyles, cargoStyles, deptStyles, hoverShadow;
    
    switch(tipo) {
        case 'gerente':
            cardStyles = `
                min-width: 220px;
                max-width: 280px;
                padding: 18px;
                background: linear-gradient(135deg, #eff6ff, #dbeafe);
                border: 3px solid #3b82f6;
                box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
                border-radius: 12px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            nomeStyles = `
                font-weight: 700;
                font-size: 15px;
                color: #1e40af;
                margin-bottom: 8px;
                line-height: 1.2;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            cargoStyles = `
                font-size: 13px;
                color: #3730a3;
                font-weight: 600;
                line-height: 1.3;
                margin-bottom: 6px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            deptStyles = `
                font-size: 11px;
                color: #6366f1;
                font-weight: 500;
                line-height: 1.2;
                padding: 3px 8px;
                background: rgba(99, 102, 241, 0.1);
                border-radius: 6px;
                margin-top: 6px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            hoverShadow = '0 8px 24px rgba(59, 130, 246, 0.35)';
            break;
            
        case 'coordenador':
            cardStyles = `
                min-width: 200px;
                max-width: 250px;
                padding: 16px;
                background: linear-gradient(135deg, #f0fdfa, #ccfbf1);
                border: 2px solid #06b6d4;
                box-shadow: 0 4px 14px rgba(6, 182, 212, 0.2);
                border-radius: 10px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            nomeStyles = `
                font-weight: 700;
                font-size: 14px;
                color: #0f766e;
                margin-bottom: 6px;
                line-height: 1.2;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            cargoStyles = `
                font-size: 12px;
                color: #0d9488;
                font-weight: 600;
                line-height: 1.3;
                margin-bottom: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            deptStyles = `
                font-size: 10px;
                color: #0891b2;
                font-weight: 500;
                line-height: 1.2;
                padding: 2px 6px;
                background: rgba(6, 182, 212, 0.1);
                border-radius: 4px;
                margin-top: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            hoverShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
            break;
            
        case 'supervisor':
            cardStyles = `
                min-width: 180px;
                max-width: 220px;
                padding: 14px;
                background: linear-gradient(135deg, #fefce8, #fef3c7);
                border: 2px solid #f59e0b;
                box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
                border-radius: 9px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            nomeStyles = `
                font-weight: 600;
                font-size: 13px;
                color: #92400e;
                margin-bottom: 6px;
                line-height: 1.2;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            cargoStyles = `
                font-size: 11px;
                color: #a16207;
                font-weight: 500;
                line-height: 1.3;
                margin-bottom: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            deptStyles = `
                font-size: 9px;
                color: #d97706;
                font-weight: 500;
                line-height: 1.2;
                padding: 2px 6px;
                background: rgba(245, 158, 11, 0.1);
                border-radius: 4px;
                margin-top: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            hoverShadow = '0 5px 18px rgba(245, 158, 11, 0.3)';
            break;
            
        case 'colaborador':
            cardStyles = `
                min-width: 180px;
                max-width: 220px;
                padding: 12px;
                background: linear-gradient(135deg, #f9fafb, #f3f4f6);
                border: 2px solid #d1d5db;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 120px;
            `;
            nomeStyles = `
                font-weight: 600;
                font-size: 11px;
                color: #374151;
                margin-bottom: 3px;
                line-height: 1.2;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            cargoStyles = `
                font-size: 9px;
                color: #6b7280;
                font-weight: 500;
                line-height: 1.3;
                margin-bottom: 2px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            deptStyles = `
                font-size: 7px;
                color: #9ca3af;
                font-weight: 500;
                line-height: 1.2;
                padding: 1px 3px;
                background: rgba(156, 163, 175, 0.1);
                border-radius: 2px;
                margin-top: 2px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            hoverShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
            break;
            
        default:
            cardStyles = `
                min-width: 200px;
                max-width: 250px;
                padding: 16px;
                background: white;
                border: 2px solid #e5e7eb;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                border-radius: 10px;
                text-align: center;
                transition: all 0.3s ease;
                cursor: pointer;
            `;
            nomeStyles = `
                font-weight: 600;
                font-size: 14px;
                color: #1f2937;
                margin-bottom: 6px;
                line-height: 1.2;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            cargoStyles = `
                font-size: 12px;
                color: #6b7280;
                font-weight: 500;
                line-height: 1.3;
                margin-bottom: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            deptStyles = `
                font-size: 10px;
                color: #9ca3af;
                font-weight: 500;
                line-height: 1.2;
                padding: 2px 6px;
                background: rgba(156, 163, 175, 0.1);
                border-radius: 4px;
                margin-top: 4px;
                word-wrap: break-word;
                overflow-wrap: break-word;
            `;
            hoverShadow = '0 6px 18px rgba(0, 0, 0, 0.15)';
    }
    
    card.style.cssText = cardStyles;
    
    const nomeElement = document.createElement('h3');
    nomeElement.textContent = nome;
    nomeElement.style.cssText = nomeStyles;
    
    const cargoElement = document.createElement('p');
    cargoElement.textContent = cargo;
    cargoElement.style.cssText = cargoStyles;
    
    const deptElement = document.createElement('p');
    deptElement.textContent = departamento;
    deptElement.style.cssText = deptStyles;
    
    card.appendChild(nomeElement);
    card.appendChild(cargoElement);
    card.appendChild(deptElement);
    
    // Adicionar botões de ação (apenas editar)
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'card-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Editar colaborador';
    editBtn.setAttribute('data-tooltip', 'Editar');
    
    // Usar addEventListener em vez de onclick
    editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        console.log('🖱️🖱️🖱️ EVENTO EDIT BUTTON CLICADO! 🖱️🖱️🖱️');
        console.log('🎯 Target do evento:', e.target);
        console.log('🎯 Colaborador para editar:', getNome(colaborador));
        
        try {
            console.log('🚀 Chamando editColaboradorModal...');
            editColaboradorModal(colaborador);
            console.log('✅ editColaboradorModal executado com sucesso');
        } catch (error) {
            console.error('💥 ERRO ao chamar editColaboradorModal:', error);
            alert('Erro ao abrir modal de edição: ' + error.message);
        }
    });
    
    actionsContainer.appendChild(editBtn);
    card.appendChild(actionsContainer);
    
    return card;
}

// Criar visualização hierárquica
function createHierarchicalView(container, colaboradores, deptName) {
    const title = document.createElement('h3');
    title.textContent = `Estrutura Hierárquica - ${deptName}`;
    title.style.cssText = `
        text-align: center;
        margin: 20px 0;
        font-size: 20px;
        font-weight: 600;
        color: #374151;
    `;
    container.appendChild(title);
    
    // Função para determinar prioridade do cargo
    const getPriority = (cargo) => {
        const cargoLower = cargo.toLowerCase();
        if (cargoLower.includes('diretor')) return 1;
        if (cargoLower.includes('gerente') || cargoLower.includes('head') || cargoLower.includes('manager')) return 2;
        if (cargoLower.includes('coordenador') || cargoLower.includes('coordinator')) return 3;
        if (cargoLower.includes('supervisor')) return 4;
        return 5; // colaboradores
    };
    
    // Ordenar colaboradores por prioridade
    const sortedColaboradores = colaboradores.sort((a, b) => {
        return getPriority(a.Cargo) - getPriority(b.Cargo);
    });
    
    // Criar visualização em cards
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        padding: 20px 0;
    `;
    
    sortedColaboradores.forEach(colaborador => {
        const card = createColaboradorCard(colaborador, 'default');
        cardsContainer.appendChild(card);
    });
    
    container.appendChild(cardsContainer);
}



function setLoadingState(message) {
    const container = document.getElementById('chart-container');
    if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #64748b;">${message}</div>`;
    }
}

function setErrorState(message) {
    const container = document.getElementById('chart-container');
    if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #dc2626;">❌ ${message}</div>`;
    }
}

function setReadyState(message) {
    const container = document.getElementById('chart-container');
    if (container) {
        container.innerHTML = `<div style="text-align: center; padding: 40px; color: #059669;">✅ ${message}</div>`;
    }
}

// Função para fazer logout
// Adicionar breadcrumb
function addBreadcrumb(container) {
    const breadcrumb = document.createElement('div');
    breadcrumb.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        padding: 15px;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    `;
    
    const backButton = document.createElement('button');
    backButton.textContent = '← Voltar';
    backButton.style.cssText = `
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: background 0.2s;
    `;
    
    backButton.addEventListener('mouseenter', () => {
        backButton.style.background = '#2563eb';
    });
    
    backButton.addEventListener('mouseleave', () => {
        backButton.style.background = '#3b82f6';
    });
    
    backButton.addEventListener('click', goBack);
    
    const path = document.createElement('span');
    path.textContent = `Presidência > ${currentSelectedPerson ? currentSelectedPerson.Colaborador : ''}`;
    path.style.cssText = `
        color: #64748b;
        font-size: 14px;
    `;
    
    breadcrumb.appendChild(backButton);
    breadcrumb.appendChild(path);
    container.appendChild(breadcrumb);
}

// Voltar para nível anterior
function goBack() {
    if (navigationHistory.length === 0) {
        // Se não há histórico, voltar para a presidência
        loadInitialData();
        return;
    }
    
    const previousLevel = navigationHistory.pop();
    if (!previousLevel || !previousLevel.person) {
        console.warn('⚠️ Nível anterior inválido ou sem pessoa. Recarregando raiz.');
        loadInitialData();
        return;
    }
    currentSelectedPerson = previousLevel.person;
    currentHierarchyLevel = previousLevel.level;

    console.log('⬅️ Voltando para:', currentSelectedPerson.Colaborador, 'nível:', currentHierarchyLevel);

    // Se voltamos para a presidência, renderizar visão raiz especial
    if (currentHierarchyLevel === 'presidencia' || currentHierarchyLevel === 'presidente') {
        renderPresidenciaView();
        return;
    }

    try {
        renderHierarchyLevel(currentSelectedPerson, currentHierarchyLevel);
    } catch (err) {
        console.error('❌ Erro ao renderizar nível anterior. Recarregando raiz.', err);
        loadInitialData();
    }
}

function handleLogout() {
    console.log('🚪 Fazendo logout...');
    
    // Limpar dados da sessão (se houver)
    sessionStorage.clear();
    localStorage.removeItem('user');
    
    // Mostrar mensagem de confirmação
    if (confirm('Tem certeza que deseja sair?')) {
        // Redirecionar para a página de login
        window.location.href = 'login.html';
    }
}

// Função para verificar se o usuário está logado
function checkAuthStatus() {
    // Apenas verifica presença, sem redirecionar imediatamente
    const user = localStorage.getItem('user');
    return !!user;
}

// ===============================================================================
// FUNÇÃO DE EXPORTAÇÃO XLSX
// ===============================================================================

function exportToXLSX() {
    try {
        console.log('📊 Iniciando exportação XLSX...');
        
        if (!colaboradoresData || colaboradoresData.length === 0) {
            alert('Nenhum dado para exportar!');
            return;
        }

        console.log('🔍 Total de colaboradores antes do processamento:', colaboradoresData.length);

        // Remover duplicatas baseado no nome do colaborador
        const colaboradoresUnicos = colaboradoresData.filter((colaborador, index, array) => {
            const nome = getNome(colaborador);
            const primeiroIndice = array.findIndex(c => getNome(c) === nome);
            return index === primeiroIndice;
        });

        console.log('✅ Colaboradores únicos após remoção de duplicatas:', colaboradoresUnicos.length);
        console.log('📊 Duplicatas removidas:', colaboradoresData.length - colaboradoresUnicos.length);

        // Debug detalhado para verificar campos do departamento
        console.log('\n🔍 Verificando campos de departamento nos primeiros 5 registros:');
        for (let i = 0; i < Math.min(5, colaboradoresUnicos.length); i++) {
            const colaborador = colaboradoresUnicos[i];
            console.log(`Colaborador ${i + 1}:`);
            console.log('  Nome:', getNome(colaborador));
            console.log('  Chaves relacionadas a departamento:', Object.keys(colaborador).filter(key => 
                key.toLowerCase().includes('departamento') || 
                key.toLowerCase().includes('depart') ||
                key.toLowerCase().includes('dept')
            ));
        }

        // Preparar dados para exportação
        const exportData = colaboradoresUnicos.map((colaborador, index) => {
            
            const nome = getNome(colaborador);
            const cargo = colaborador['Cargo'] || colaborador['cargo'] || '';
            const area = colaborador['Área'] || colaborador['Areas'] || colaborador['area'] || '';
            
            // O campo "Departamento" na exportação será preenchido com o valor de "Área"
            // pois nos dados originais só temos "Área"
            const departamento = area; // Usar área como departamento
            
            const gestor = colaborador['Superior imediato'] || 
                          colaborador['Superior_imediato'] || 
                          getGestor(colaborador) || '';
            
            // Log para os primeiros registros
            if (index < 3) {
                console.log(`\n📊 Dados extraídos para colaborador ${index + 1}:`);
                console.log('Nome:', nome);
                console.log('Cargo:', cargo);
                console.log('Área:', area);
                console.log('Departamento (=Área):', departamento);
                console.log('Gestor:', gestor);
            }
            
            return {
                'Nome': nome,
                'Cargo': cargo,
                'Área': area,
                'Departamento': departamento,
                'Gestor': gestor
            };
        })
        // Filtrar registros que tenham pelo menos nome preenchido
        .filter(item => item.Nome && item.Nome.trim() !== '');

        console.log('\n📊 Dados finais preparados para exportação:');
        console.log('Total final de registros:', exportData.length);
        console.log('📊 Registros com cargo preenchido:', exportData.filter(item => item.Cargo && item.Cargo.trim()).length);
        console.log('📊 Registros com área preenchida:', exportData.filter(item => item.Área && item.Área.trim()).length);
        console.log('📊 Registros com departamento preenchido:', exportData.filter(item => item.Departamento && item.Departamento.trim()).length);
        console.log('📊 Registros com gestor preenchido:', exportData.filter(item => item.Gestor && item.Gestor.trim()).length);

        // Criar workbook e worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Configurar largura das colunas otimizadas
        const colWidths = [
            { wch: 35 }, // Nome
            { wch: 40 }, // Cargo
            { wch: 25 }, // Área
            { wch: 25 }, // Departamento
            { wch: 35 }  // Gestor
        ];
        ws['!cols'] = colWidths;

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');

        // Gerar nome do arquivo com data atual
        const hoje = new Date();
        const dataStr = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
        const nomeArquivo = `organograma_colaboradores_${dataStr}.xlsx`;

        // Fazer download do arquivo
        XLSX.writeFile(wb, nomeArquivo);
        
        console.log(`✅ Arquivo exportado: ${nomeArquivo}`);
        console.log(`📊 Total de registros exportados: ${exportData.length}`);
        
        // Mostrar estatísticas dos dados
        const comCargo = exportData.filter(item => item.Cargo && item.Cargo.trim()).length;
        const comArea = exportData.filter(item => item.Área && item.Área.trim()).length;
        const comDepartamento = exportData.filter(item => item.Departamento && item.Departamento.trim()).length;
        const comGestor = exportData.filter(item => item.Gestor && item.Gestor.trim()).length;
        
        alert(`Exportação concluída! ✅\n\nArquivo: ${nomeArquivo}\nTotal: ${exportData.length} colaboradores únicos\n\nDados preenchidos:\n• Cargos: ${comCargo}\n• Áreas: ${comArea}\n• Departamentos: ${comDepartamento}\n• Gestores: ${comGestor}\n\n(Duplicatas removidas: ${colaboradoresData.length - colaboradoresUnicos.length})`);
        
    } catch (error) {
        console.error('❌ Erro na exportação XLSX:', error);
        alert('Erro ao exportar arquivo. Verifique o console para detalhes.');
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando aplicação com Supabase...');
    
    // Verificar se o usuário está logado
    const user = localStorage.getItem('user');
    if (!user) {
        console.warn('⚠️ Usuário não autenticado. Redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(user);
        console.log('✅ Usuário autenticado:', userData.email);
    } catch (e) {
        console.error('❌ Erro ao processar dados de usuário. Redirecionando para login...');
        window.location.href = 'login.html';
        return;
    }
    
    // Configurar UI
    setupAddColaboradorModal();
    setupEditColaboradorModal();
    setupReassignModal();
    
    // Inicializar Supabase e carregar dados
    await initSupabaseConnection();
    
    // Setup de eventos
    const logoutButton = document.getElementById('btn-logout');
    if (logoutButton) logoutButton.addEventListener('click', handleLogout);
    
    const exportButton = document.getElementById('btn-export-xlsx');
    if (exportButton) exportButton.addEventListener('click', exportToXLSX);
    
    // Event listener para o filtro de regime
    const regimeSelect = document.getElementById('regime-select');
    if (regimeSelect) {
        regimeSelect.addEventListener('change', (e) => {
            currentRegimeFilter = e.target.value;
            console.log('🔄 Filtro de regime alterado para:', currentRegimeFilter);
            // Recarregar a view atual com o novo filtro
            if (currentHierarchyLevel === 'presidencia') {
                renderPresidenciaView();
            } else if (currentSelectedPerson) {
                renderSubordinadosView(currentSelectedPerson, currentHierarchyLevel);
            }
        });
    }
    
    console.log('✅ Aplicação inicializada com sucesso!');
});

// ================== FUNÇÃO PARA ADICIONAR NOVO SETOR À LISTA ==================
function adicionarSetorALista(novoSetor) {
    const selectDepartamento = document.getElementById('colaborador-departamento');
    
    if (!selectDepartamento) {
        console.warn('⚠️ Select de departamento não encontrado');
        return;
    }
    
    // Verificar se o setor já existe
    const setorJaExiste = Array.from(selectDepartamento.options).some(option => 
        option.value.toLowerCase() === novoSetor.toLowerCase()
    );
    
    if (!setorJaExiste) {
        // Criar nova opção
        const novaOpcao = document.createElement('option');
        novaOpcao.value = novoSetor;
        novaOpcao.textContent = novoSetor;
        
        // Adicionar à lista (mantendo ordem alfabética)
        let adicionado = false;
        for (let i = 1; i < selectDepartamento.options.length; i++) {
            if (novoSetor.localeCompare(selectDepartamento.options[i].value) < 0) {
                selectDepartamento.insertBefore(novaOpcao, selectDepartamento.options[i]);
                adicionado = true;
                break;
            }
        }
        
        // Se não foi adicionado (é o maior alfabeticamente), adicionar no final
        if (!adicionado) {
            selectDepartamento.appendChild(novaOpcao);
        }
        
        console.log('✅ Novo setor adicionado à lista:', novoSetor);
    } else {
        console.log('ℹ️ Setor já existe na lista:', novoSetor);
    }
}
