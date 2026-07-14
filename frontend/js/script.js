const API_URL = 'https://controle-manutencao-pam.onrender.com/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const userName = document.getElementById('user-name');
const equipamentosList = document.getElementById('equipamentos-list');
const manutencoesList = document.getElementById('manutencoes-list');
const alertasList = document.getElementById('alertas-list');

if (token && currentUser) {
    showDashboard();
} else {
    showLogin();
}

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
            currentUser = data.usuario;
            localStorage.setItem('token', token);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showDashboard();
        } else {
            const errorDiv = document.getElementById('login-error');
            errorDiv.textContent = data.erro || 'Erro ao fazer login';
            errorDiv.classList.remove('d-none');
        }
    } catch (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = 'Erro ao conectar com o servidor';
        errorDiv.classList.remove('d-none');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    token = null;
    currentUser = null;
    showLogin();
});

function showLogin() {
    loginContainer.classList.remove('d-none');
    dashboardContainer.classList.add('d-none');
}

function showDashboard() {
    loginContainer.classList.add('d-none');
    dashboardContainer.classList.remove('d-none');
    if (currentUser) {
        userName.textContent = currentUser.nome;
    }
    carregarEquipamentos();
    carregarManutencoes();
    carregarAlertas();
}

async function carregarEquipamentos() {
    try {
        const response = await fetch(`${API_URL}/equipamentos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            showLogin();
            return;
        }

        const equipamentos = await response.json();
        
        if (equipamentos.length === 0) {
            equipamentosList.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Nenhum equipamento cadastrado</p></div>';
            return;
        }

        equipamentosList.innerHTML = equipamentos.map(eq => `
            <div class="equipamento-item">
                <h5><i class="bi bi-cpu"></i> ${eq.nome}</h5>
                <p><strong>Tipo:</strong> ${eq.tipo}</p>
                <p><strong>Localização:</strong> ${eq.localizacao || 'N/A'}</p>
                <p><strong>Estoque:</strong> ${eq.quantidade_estoque} unidade(s)</p>
                <p><strong>Próxima Manutenção:</strong> <span class="badge bg-info">${eq.proxima_manutencao || 'Não agendada'}</span></p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
        equipamentosList.innerHTML = '<div class="alert alert-danger">Erro ao carregar equipamentos</div>';
    }
}

async function carregarManutencoes() {
    try {
        const response = await fetch(`${API_URL}/manutencoes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            showLogin();
            return;
        }

        const manutencoes = await response.json();
        
        if (manutencoes.length === 0) {
            manutencoesList.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Nenhuma manutenção registrada</p></div>';
            return;
        }

        manutencoesList.innerHTML = manutencoes.map(m => `
            <div class="manutencao-item">
                <h5><i class="bi bi-wrench"></i> Equipamento #${m.equipamento_id}</h5>
                <p><strong>Data:</strong> ${new Date(m.data_manutencao).toLocaleDateString('pt-BR')}</p>
                <p><strong>Tipo:</strong> <span class="badge bg-primary">${m.tipo}</span></p>
                <p><strong>Técnico:</strong> ${m.tecnico || 'N/A'}</p>
                <p><strong>Empresa:</strong> ${m.empresa || 'N/A'}</p>
                <p><strong>Custo:</strong> R$ ${(m.custo || 0).toFixed(2)}</p>
                <p><strong>Próxima Manutenção:</strong> ${m.proxima_data_prevista || 'Não agendada'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar manutenções:', error);
        manutencoesList.innerHTML = '<div class="alert alert-danger">Erro ao carregar manutenções</div>';
    }
}

async function carregarAlertas() {
    try {
        const response = await fetch(`${API_URL}/alertas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            showLogin();
            return;
        }

        const alertas = await response.json();
        
        if (alertas.length === 0) {
            alertasList.innerHTML = '<div class="empty-state"><i class="bi bi-check-circle"></i><p>Nenhum alerta ativo</p></div>';
            return;
        }

        alertasList.innerHTML = alertas.map(a => {
            const classe = a.tipo_alerta === 'manutencao_vencida' ? 'alerta-vencida' : '';
            return `
                <div class="alerta-item ${classe}">
                    <h5><i class="bi bi-exclamation-triangle"></i> ${a.tipo_alerta.replace(/_/g, ' ').toUpperCase()}</h5>
                    <p><strong>Equipamento ID:</strong> ${a.equipamento_id}</p>
                    <p><strong>Descrição:</strong> ${a.descricao}</p>
                    <p><strong>Data:</strong> ${new Date(a.data_alerta).toLocaleDateString('pt-BR')}</p>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        alertasList.innerHTML = '<div class="alert alert-danger">Erro ao carregar alertas</div>';
    }
}

document.getElementById('gerar-alertas-btn').addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_URL}/alertas/gerar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            carregarAlertas();
            alert('✅ Alertas gerados com sucesso!');
        } else {
            alert('❌ Erro ao gerar alertas');
        }
    } catch (error) {
        console.error('Erro ao gerar alertas:', error);
        alert('❌ Erro ao gerar alertas');
    }
});

document.getElementById('add-equipamento-btn').addEventListener('click', () => {
    const nome = prompt('Nome do equipamento:');
    if (!nome) return;
    
    const tipo = prompt('Tipo (ex: Bomba, Ventilador):');
    if (!tipo) return;
    
    const localizacao = prompt('Localização:');
    const quantidade = prompt('Quantidade em estoque:', '1');

    criarEquipamento(nome, tipo, localizacao, parseInt(quantidade) || 1);
});

document.getElementById('add-manutencao-btn').addEventListener('click', () => {
    const equipamento_id = prompt('ID do equipamento:');
    if (!equipamento_id) return;
    
    const data = prompt('Data da manutenção (YYYY-MM-DD):');
    if (!data) return;
    
    const tipo = prompt('Tipo (Preventiva/Corretiva):');
    if (!tipo) return;
    
    const tecnico = prompt('Técnico responsável:');
    const empresa = prompt('Empresa:');
    const custo = prompt('Custo (R$):', '0');

    criarManutencao(parseInt(equipamento_id), data, tipo, tecnico, empresa, parseFloat(custo) || 0);
});

async function criarEquipamento(nome, tipo, localizacao, quantidade) {
    try {
        const response = await fetch(`${API_URL}/equipamentos`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,
                tipo,
                localizacao,
                quantidade_estoque: quantidade
            })
        });

        if (response.ok) {
            alert('✅ Equipamento criado com sucesso!');
            carregarEquipamentos();
        } else {
            const error = await response.json();
            alert('❌ Erro: ' + (error.erro || 'Erro ao criar equipamento'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao criar equipamento: ' + error.message);
    }
}

async function criarManutencao(equipamento_id, data_manutencao, tipo, tecnico, empresa, custo) {
    try {
        const response = await fetch(`${API_URL}/manutencoes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                equipamento_id,
                data_manutencao,
                tipo,
                tecnico,
                empresa,
                custo
            })
        });

        if (response.ok) {
            alert('✅ Manutenção registrada com sucesso!');
            carregarManutencoes();
        } else {
            const error = await response.json();
            alert('❌ Erro: ' + (error.erro || 'Erro ao registrar manutenção'));
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao registrar manutenção: ' + error.message);
    }
}
