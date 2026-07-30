const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzr8_dBRPBw73PCja-GkWAhvcIKHexbohMm5bMpNyAQ8OynAXvfGyAFCM8X4pNZTKGYQg/exec"; // <--- DEPOIS DE IMPLANTAR COLE A URL AQUI

let abastecimentos = [];
let veiculos = [];
let indexParaExcluir = null;
const SENHA = "1234";

document.addEventListener('DOMContentLoaded', carregar);
document.getElementById('formVeiculo').addEventListener('submit', salvarVeiculo);
document.getElementById('formAbastecimento').addEventListener('submit', salvarAbastecimento);

function mostrarTela(id) {
    document.querySelectorAll('.tela').forEach(t => t.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

async function carregar() {
    let res = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify({action: "getAll"}) });
    let dados = await res.json();
    abastecimentos = dados.abastecimentos;
    veiculos = dados.veiculos;
    atualizarSelects();
    mostrarListaVeiculos();
    mostrar();
}

async function salvarVeiculo(e) {
    e.preventDefault();
    let obj = {
        action: "addVeiculo",
        placa: document.getElementById('placaVeiculo').value.toUpperCase(),
        nome: document.getElementById('nomeVeiculo').value.toUpperCase(),
        ano: document.getElementById('anoVeiculo').value,
        obs: document.getElementById('obsVeiculo').value
    };
    await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(obj) });
    alert('VEICULO SALVO!');
    e.target.reset();
    carregar();
}

async function salvarAbastecimento(e) {
    e.preventDefault();
    let veiculoSelecionado = veiculos.find(v => v.PLACA === document.getElementById('selectVeiculo').value);
    let obj = {
        action: "addAbastecimento",
        data: document.getElementById('data').value,
        placa: veiculoSelecionado.PLACA,
        nome: veiculoSelecionado.NOME_VEICULO,
        motorista: document.getElementById('motorista').value.toUpperCase(),
        litros: document.getElementById('litros').value,
        valor: document.getElementById('valor').value,
        km: document.getElementById('km').value
    };
    await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(obj) });
    alert('ABASTECIMENTO SALVO!');
    e.target.reset();
    carregar();
}

function atualizarSelects() {
    let selectVeiculo = document.getElementById('selectVeiculo');
    let filtroVeiculo = document.getElementById('filtroVeiculo');
    selectVeiculo.innerHTML = '<option value="">SELECIONE</option>';
    filtroVeiculo.innerHTML = '<option value="">TODOS</option>';
    veiculos.forEach(v => {
        selectVeiculo.innerHTML += `<option value="${v.PLACA}">${v.NOME_VEICULO} - ${v.PLACA}</option>`;
        filtroVeiculo.innerHTML += `<option value="${v.PLACA}">${v.NOME_VEICULO} - ${v.PLACA}</option>`;
    });
}

function mostrarListaVeiculos() {
    let html = '<table><tr><th>PLACA</th><th>VEICULO</th><th>ANO</th></tr>';
    html += veiculos.map(v => `<tr><td>${v.PLACA}</td><td>${v.NOME_VEICULO}</td><td>${v.ANO}</td></tr>`).join('');
    html += '</table>';
    document.getElementById('listaVeiculos').innerHTML = html;
}

// O resto da função mostrar, gerarPDF, excluir é igual a anterior, só que agora usa veiculos
function mostrar() { /*...mesma função de antes... */ }
function gerarPDF() { /*...mesma função de antes... */ }
function pedirSenha(index) { indexParaExcluir = index; document.getElementById('senhaBox').style.display = 'block'; }
function cancelarExclusao() { indexParaExcluir = null; document.getElementById('senhaBox').style.display = 'none'; }
async function confirmarExclusao() { /*...mesma função de antes... */ }