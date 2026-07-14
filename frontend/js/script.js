const API_URL = 'https://controle-manutencao-pam.onrender.com/api';
let token = localStorage.getItem('token');

// Elementos do DOM
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const equipamentosList = document.getElementById('equipamentos-list');
const manutencoesList = document.getElementById('manutencoes-list');
const alertasList = document.getElementById('alertas-list');

// Verificar se já está logado
if (token) {
    showDashboard();
} else {
    showLogin();
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });

        const data = await response.json();

        if (response.ok) {
            token = data.token;
            localStorage.setItem('token', token);
            showDashboard();
        } else {
            document.getElementById('login-error').textContent = data.erro;
        }
    } catch (error) {
        document.getElementById('login-error').textContent = 'Erro ao fazer login';
    }
});

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    token = null;
    showLogin();
});

// Mostrar login
function showLogin() {
    loginContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
}

// Mostrar dashboard
function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    carregarEquipamentos();
    carregarManutencoes();
    carregarAlertas();
}

// Carregar equipamentos
async function carregarEquipamentos() {
    try {
        const response = await fetch(`${API_URL}/equipamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const equipamentos = await response.json();
        equipamentosList.innerHTML = equipamentos.map(eq => `
            <div class="equipamento-item">
                <h3>${eq.nome}</h3>
                <p><strong>Tipo:</strong> ${eq.tipo}</p>
                <p><strong>Localização:</strong> ${eq.localizacao}</p>
                <p><strong>Próxima Manutenção:</strong> ${eq.proxima_manutencao || 'Não agendada'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
    }
}

// Carregar manutenções
async function carregarManutencoes() {
    try {
        const response = await fetch(`${API_URL}/manutencoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const manutencoes = await response.json();
        manutencoesList.innerHTML = manutencoes.map(m => `
            <div class="manutencao-item">
                <h3>Equipamento ID: ${m.equipamento_id}</h3>
                <p><strong>Data:</strong> ${m.data_manutencao}</p>
                <p><strong>Tipo:</strong> ${m.tipo}</p>
                <p><strong>Técnico:</strong> ${m.tecnico}</p>
                <p><strong>Custo:</strong> R$ ${m.custo || '0,00'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar manutenções:', error);
    }
}

// Carregar alertas
async function carregarAlertas() {
    try {
        const response = await fetch(`${API_URL}/alertas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const alertas = await response.json();
        alertasList.innerHTML = alertas.map(a => `
            <div class="alerta-item">
                <h3>${a.tipo_alerta}</h3>
                <p><strong>Equipamento ID:</strong> ${a.equipamento_id}</p>
                <p><strong>Descrição:</strong> ${a.descricao}</p>
                <p><strong>Data:</strong> ${new Date(a.data_alerta).toLocaleDateString('pt-BR')}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
    }
}

// Gerar alertas
document.getElementById('gerar-alertas-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/alertas/gerar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarAlertas();
            alert('Alertas gerados com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao gerar alertas:', error);
    }
});
