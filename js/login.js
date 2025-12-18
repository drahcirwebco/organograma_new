// js/login.js

// Importar Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// Credenciais do Supabase
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let supabase = null;

try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase inicializado com sucesso');
} catch (e) {
    console.error('❌ Erro ao inicializar Supabase:', e);
}

// Elementos do DOM
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');

if (!loginForm) {
    console.error('❌ Formulário de login não encontrado!');
} else {
    console.log('✅ Formulário de login encontrado');
    
    // Listener para o formulário
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('📝 Formulário enviado');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        if (!email || !password) {
            showError('Por favor, preencha email e senha.');
            return;
        }
        
        await handleLogin(email, password);
    });
}

async function handleLogin(email, password) {
    console.log('🔐 Tentando fazer login com:', email);
    
    if (!supabase) {
        showError('Erro ao conectar com o banco de dados. Tente novamente.');
        return;
    }
    
    try {
        console.log('🔍 Buscando usuário na tabela organograma_acessos...');
        
        const { data, error } = await supabase
            .from('organograma_acessos')
            .select('id, email, nome, ativo, senha')
            .eq('email', email);
        
        console.log('Resultado da busca:', { data, error });
        
        if (error) {
            console.error('❌ Erro ao buscar usuário:', error);
            showError('Erro ao conectar. Tente novamente.');
            return;
        }
        
        if (!data || data.length === 0) {
            console.warn('⚠️ Usuário não encontrado');
            showError('E-mail ou senha incorretos.');
            return;
        }
        
        const user = data[0];
        console.log('✅ Usuário encontrado:', user.email);
        
        // Validar senha
        if (user.senha !== password) {
            console.warn('⚠️ Senha incorreta');
            showError('E-mail ou senha incorretos.');
            return;
        }
        
        console.log('✅ Senha correta! Login bem-sucedido');
        
        // Salvar dados do usuário
        const userData = {
            id: user.id,
            email: user.email,
            nome: user.nome,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.setItem('justLoggedAt', String(Date.now()));
        
        console.log('💾 Dados salvos no localStorage');
        console.log('🔄 Redirecionando para index.html...');
        
        // Redirecionar
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
        
    } catch (error) {
        console.error('❌ Erro inesperado:', error);
        showError('Erro ao conectar. Tente novamente.');
    }
}

function showError(message) {
    console.warn('[LOGIN ERROR]', message);
    if (loginError) {
        loginError.textContent = message;
        loginError.classList.remove('hidden');
    }
}