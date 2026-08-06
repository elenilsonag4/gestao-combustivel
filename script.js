// ==========================================
// CONFIGURAÇÃO INICIAL
// ==========================================
const URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbzr8_dBRPBw73PCja-GkWAhvcIKHexbohMm5bMpNyAQ8OynAXvfGyAFCM8X4pNZTKGYQg/exec'; // Ex: https://script.google.com/macros/s/.../exec

// ==========================================
// FUNÇÃO DE ENVIO DE DADOS (AJUSTADA)
// ==========================================
/**
 * Envia as requisições para o Google Apps Script usando 'text/plain'
 * para evitar bloqueios de CORS e impedir que os dados cheguem vazios.
 */
async function enviarParaGoogleSheets(acao, dados) {
    if (!URL_SCRIPT || URL_SCRIPT.includes('COLE_AQUI_A_SUA_URL')) {
        console.warn("Aviso: URL_SCRIPT não configurada em script.js");
        return;
    }

    try {
        const payload = JSON.stringify({
            acao: acao,
            dados: dados
        });

        const response = await fetch(URL_SCRIPT, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: payload
        });

        const resultado = await response.text();
        console.log(`[Google Sheets] Ação: ${acao} | Resposta:`, resultado);
        return resultado;
    } catch (error) {
        console.error("Erro ao enviar para o Google Sheets:", error);
    }
}

// ==========================================
// ESTRUTURA DE DADOS LOCAL (STORAGE)
// ==========================================
let veiculos = JSON.parse(localStorage.getItem('veiculos')) || [];
let abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
let manutencoes = JSON.parse(localStorage.getItem('manutencoes')) || [];

function salvarStorage() {
    localStorage.setItem('veiculos', JSON.stringify(veiculos));
    localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
    localStorage.setItem('manutencoes', JSON.stringify(manutencoes));
}

// ==========================================
// INICIALIZAÇÃO DA PÁGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    atualizarSelectsVeiculos();
    atualizarTabelas();
    configurarFormularios();
});

// ==========================================
// CONFIGURAÇÃO DOS FORMULÁRIOS
// ==========================================
function configurarFormularios() {
    // 1. Cadastrar Veículo
    const formVeiculo = document.getElementById('formVeiculo');
    if (formVeiculo) {
        formVeiculo.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('nomeVeiculo').value.trim();
            const placa = document.getElementById('placaVeiculo').value.trim().toUpperCase();

            if (!nome || !placa) return alert('Preencha todos os campos!');

            const novoVeiculo = { nome, placa };
            veiculos.push(novoVeiculo);
            salvarStorage();

            // Envia para o Sheets
            await enviarParaGoogleSheets('cadastrarVeiculo', novoVeiculo);

            formVeiculo.reset();
            atualizarSelectsVeiculos();
            atualizarTabelas();
            alert('Veículo cadastrado com sucesso!');
        });
    }

    // 2. Registrar Abastecimento
    const formAbastecimento = document.getElementById('formAbastecimento');
    if (formAbastecimento) {
        formAbastecimento.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const placaSelect = document.getElementById('selectVeiculoAbastecimento');
            const placa = placaSelect.value;
            const veiculo = veiculos.find(v => v.placa === placa);

            const dadosAbastecimento = {
                data: new Date().toLocaleString("pt-BR"),
                placa: placa,
                nomeVeiculo: veiculo ? veiculo.nome : 'Desconhecido',
                motorista: document.getElementById('motorista').value.trim(),
                litros: parseFloat(document.getElementById('litros').value) || 0,
                valorTotal: parseFloat(document.getElementById('valorTotal').value) || 0,
                kmAtual: parseFloat(document.getElementById('kmAtual').value) || 0,
                consumo: '-' // Calculado automaticamente na tabela se houver histórico
            };

            // Cálculo do Consumo Médio (comparado ao último KM do mesmo veículo)
            const historicoVeiculo = abastecimentos.filter(a => a.placa === placa);
            if (historicoVeiculo.length > 0) {
                const ultimoKm = historicoVeiculo[historicoVeiculo.length - 1].kmAtual;
                const kmRodados = dadosAbastecimento.kmAtual - ultimoKm;
                if (kmRodados > 0 && dadosAbastecimento.litros > 0) {
                    dadosAbastecimento.consumo = (kmRodados / dadosAbastecimento.litros).toFixed(2) + ' Km/L';
                }
            }

            abastecimentos.push(dadosAbastecimento);
            salvarStorage();

            // Envia para o Sheets
            await enviarParaGoogleSheets('registrarAbastecimento', dadosAbastecimento);

            formAbastecimento.reset();
            atualizarTabelas();
            alert('Abastecimento registrado com sucesso!');
        });
    }

    // 3. Registrar Manutenção
    const formManutencao = document.getElementById('formManutencao');
    if (formManutencao) {
        formManutencao.addEventListener('submit', async (e) => {
            e.preventDefault();

            const placaSelect = document.getElementById('selectVeiculoManutencao');
            const placa = placaSelect.value;
            const veiculo = veiculos.find(v => v.placa === placa);

            const dadosManutencao = {
                data: new Date().toLocaleString("pt-BR"),
                placa: placa,
                nomeVeiculo: veiculo ? veiculo.nome : 'Desconhecido',
                tipoManutencao: document.getElementById('tipoManutencao').value,
                kmManutencao: parseFloat(document.getElementById('kmManutencao').value) || 0,
                proximaTrocaKm: parseFloat(document.getElementById('proximaTrocaKm').value) || 0
            };

            manutencoes.push(dadosManutencao);
            salvarStorage();

            // Envia para o Sheets
            await enviarParaGoogleSheets('registrarManutencao', dadosManutencao);

            formManutencao.reset();
            atualizarTabelas();
            alert('Manutenção registrada com sucesso!');
        });
    }
}

// ==========================================
// ATUALIZAÇÃO DA INTERFACE E TABELAS
// ==========================================
function atualizarSelectsVeiculos() {
    const selects = ['selectVeiculoAbastecimento', 'selectVeiculoManutencao'];
    
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Selecione um veículo...</option>';
            veiculos.forEach(v => {
                const option = document.createElement('option');
                option.value = v.placa;
                option.textContent = `${v.nome} - ${v.placa}`;
                select.appendChild(option);
            });
        }
    });
}

function atualizarTabelas() {
    // Tabela de Veículos
    const tbodyVeiculos = document.getElementById('tabelaVeiculos');
    if (tbodyVeiculos) {
        tbodyVeiculos.innerHTML = veiculos.map((v, index) => `
            <tr>
                <td>${v.nome}</td>
                <td>${v.placa}</td>
                <td>
                    <button onclick="editarVeiculo(${index})">Editar</button>
                    <button onclick="excluirVeiculo(${index})">Excluir</button>
                </td>
            </tr>
        `).join('');
    }

    // Tabela de Abastecimentos
    const tbodyAbastecimentos = document.getElementById('tabelaAbastecimentos');
    if (tbodyAbastecimentos) {
        tbodyAbastecimentos.innerHTML = abastecimentos.map((a, index) => `
            <tr>
                <td>${a.data}</td>
                <td>${a.placa}</td>
                <td>${a.nomeVeiculo}</td>
                <td>${a.motorista}</td>
                <td>${a.litros} L</td>
                <td>R$ ${Number(a.valorTotal).toFixed(2)}</td>
                <td>${a.kmAtual} Km</td>
                <td>${a.consumo}</td>
                <td>
                    <button onclick="excluirAbastecimento(${index})">Excluir</button>
                </td>
            </tr>
        `).join('');
    }

    // Tabela de Manutenção
    const tbodyManutencoes = document.getElementById('tabelaManutencoes');
    if (tbodyManutencoes) {
        tbodyManutencoes.innerHTML = manutencoes.map((m, index) => `
            <tr>
                <td>${m.data}</td>
                <td>${m.placa}</td>
                <td>${m.nomeVeiculo}</td>
                <td>${m.tipoManutencao}</td>
                <td>${m.kmManutencao} Km</td>
                <td>${m.proximaTrocaKm} Km</td>
                <td>
                    <button onclick="excluirManutencao(${index})">Excluir</button>
                </td>
            </tr>
        `).join('');
    }
}

// ==========================================
// AÇÕES DE EXCLUSÃO E EDIÇÃO
// ==========================================
async function excluirVeiculo(index) {
    if (confirm('Deseja realmente excluir este veículo?')) {
        const veiculoRemovido = veiculos[index];
        veiculos.splice(index, 1);
        salvarStorage();

        await enviarParaGoogleSheets('excluirVeiculo', { placa: veiculoRemovido.placa });

        atualizarSelectsVeiculos();
        atualizarTabelas();
    }
}

async function editarVeiculo(index) {
    const veiculo = veiculos[index];
    const novoNome = prompt('Novo Nome:', veiculo.nome);
    const novaPlaca = prompt('Nova Placa:', veiculo.placa);

    if (novoNome && novaPlaca) {
        const placaAntiga = veiculo.placa;
        veiculo.nome = novoNome.trim();
        veiculo.placa = novaPlaca.trim().toUpperCase();
        salvarStorage();

        await enviarParaGoogleSheets('editarVeiculo', {
            placaAntiga: placaAntiga,
            nomeNovo: veiculo.nome,
            placaNova: veiculo.placa
        });

        atualizarSelectsVeiculos();
        atualizarTabelas();
    }
}

async function excluirAbastecimento(index) {
    if (confirm('Deseja excluir este registro de abastecimento?')) {
        const item = abastecimentos[index];
        abastecimentos.splice(index, 1);
        salvarStorage();

        await enviarParaGoogleSheets('excluirAbastecimento', { item: [item.data, item.placa] });
        atualizarTabelas();
    }
}

async function excluirManutencao(index) {
    if (confirm('Deseja excluir este registro de manutenção?')) {
        const item = manutencoes[index];
        manutencoes.splice(index, 1);
        salvarStorage();

        await enviarParaGoogleSheets('excluirManutencao', { item: [item.data, item.placa] });
        atualizarTabelas();
    }
}
