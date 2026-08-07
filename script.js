const URL_SCRIPT = 'https://script.google.com/macros/s/AKfycbzr8_dBRPBw73PCja-GkWAhvcIKHexbohMm5bMpNyAQ8OynAXvfGyAFCM8X4pNZTKGYQg/exec';

let veiculos = JSON.parse(localStorage.getItem('veiculos')) || [];
let abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
let manutencoes = JSON.parse(localStorage.getItem('manutencoes')) || [];

function salvarStorage() {
    localStorage.setItem('veiculos', JSON.stringify(veiculos));
    localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
    localStorage.setItem('manutencoes', JSON.stringify(manutencoes));
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarSelectsVeiculos();
    atualizarTabelaAbastecimento();
});

async function enviarParaGoogleSheets(acao, dados) {

    const payload = {
        acao: acao,
        dados: dados
    };

    console.log("=================================");
    console.log("ENVIANDO PARA GOOGLE SHEETS");
    console.log(payload);
    console.log(JSON.stringify(payload));
    console.log("=================================");

    try {

        const resposta = await fetch(URL_SCRIPT, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify(payload)
        });

        console.log("ENVIO CONCLUÍDO");
        console.log("STATUS:", resposta.status);

    } catch (erro) {

        console.error("ERRO AO ENVIAR:", erro);

    }
}

// CADASTRAR VEICULO
function cadastrarVeiculo() {
    const nome = document.getElementById('nomeVeiculo').value.trim();
    const placa = document.getElementById('placaVeiculo').value.trim().toUpperCase();
    if (!nome || !placa) return alert('Preencha Nome e Placa!');
    
    veiculos.push({ nome, placa });
    salvarStorage();
    enviarParaGoogleSheets('cadastrarVeiculo', { nome, placa });
    atualizarSelectsVeiculos();
    document.getElementById('nomeVeiculo').value = '';
    document.getElementById('placaVeiculo').value = '';
    alert('Veículo cadastrado!');
}

// REGISTRAR ABASTECIMENTO
async function registrarAbastecimento() {
    const placa = document.getElementById('selectVeiculo').value;
    if(!placa) return alert('Selecione um veículo');
    const veiculo = veiculos.find(v => v.placa === placa);

    const dados = {
        dataAbastecimento: document.getElementById('dataAbastecimento').value,
        placa: placa,
        nome: veiculo ? veiculo.nome : '',
        motorista: document.getElementById('motorista').value,
        litros: document.getElementById('litros').value,
        valorTotal: document.getElementById('valorTotal').value,
        kmAtual: document.getElementById('kmAtual').value,
        consumo: '-'
    };

    abastecimentos.push(dados);
    salvarStorage();
    await enviarParaGoogleSheets('registrarAbastecimento', dados);
    atualizarTabelaAbastecimento();
    alert('Abastecimento registrado!');
    document.querySelector('.card:nth-child(4) input, .card:nth-child(4) select').value = '';
}

function atualizarSelectsVeiculos() {
    const select = document.getElementById('selectVeiculo');
    select.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    veiculos.forEach(v => {
        select.innerHTML += `<option value="${v.placa}">${v.nome} - ${v.placa}</option>`;
    });
    document.getElementById('selectVeiculoManutencao').innerHTML = select.innerHTML;
}

function atualizarTabelaAbastecimento() {
    const tbody = document.querySelector('#tabelaHistorico tbody');
    tbody.innerHTML = '';
    abastecimentos.forEach(l => {
        tbody.innerHTML += `<tr><td>${l.dataAbastecimento}</td><td>${l.placa}</td><td>${l.nome}</td><td>${l.motorista}</td><td>${l.litros}</td><td>R$ ${Number(l.valorTotal).toFixed(2)}</td><td>${l.kmAtual}</td><td>${l.consumo}</td><td>-</td></tr>`;
    });
}

// MANUTENCAO
function abrirModalManutencao(){ document.getElementById('modalManutencao').style.display = 'block'; }
function fecharModalManutencao(){ document.getElementById('modalManutencao').style.display = 'none'; }
function registrarManutencao(){
    const placa = document.getElementById('selectVeiculoManutencao').value;
    const veiculo = veiculos.find(v => v.placa === placa);
    const dados = {
        dataManutencao: document.getElementById('dataManutencao').value,
        placa: placa,
        nome: veiculo ? veiculo.nome : '',
        tipo: document.getElementById('tipoManutencao').value,
        km: document.getElementById('kmManutencao').value,
        proximaTroca: document.getElementById('proximaTrocaKm').value
    };
    manutencoes.push(dados);
    salvarStorage();
    enviarParaGoogleSheets('registrarManutencao', dados);
    fecharModalManutencao();
    alert('Manutenção registrada!');
}
