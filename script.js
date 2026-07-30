const URL_SCRIPT = "https://script.google.com/macros/s/AKfycbzr8_dBRPBw73PCja-GkWAhvcIKHexbohMm5bMpNyAQ8OynAXvfGyAFCM8X4pNZTKGYQg/exec"; // <--- DEPOIS DE IMPLANTAR COLE A URL AQUI

let abastecimentos = [];
let indexParaExcluir = null;
const SENHA = "1234";

document.addEventListener('DOMContentLoaded', carregar);
document.getElementById('formAbastecimento').addEventListener('submit', salvar);

async function carregar() {
    let res = await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify({action: "getAll"}) });
    abastecimentos = await res.json();
    atualizarFiltro();
    mostrar();
}

async function salvar(e) {
    e.preventDefault();
    let obj = {
        action: "add",
        data: document.getElementById('data').value,
        placa: document.getElementById('placa').value.toUpperCase(),
        nome: document.getElementById('nome').value.toUpperCase(),
        motorista: document.getElementById('motorista').value.toUpperCase(),
        litros: document.getElementById('litros').value,
        valor: document.getElementById('valor').value,
        km: document.getElementById('km').value
    };
    await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify(obj) });
    alert('SALVO COM SUCESSO!');
    e.target.reset();
    carregar();
}

function atualizarFiltro() {
    let placas = [...new Set(abastecimentos.map(d => d.PLACA))];
    let select = document.getElementById('filtroVeiculo');
    select.innerHTML = '<option value="">TODOS</option>';
    placas.forEach(p => select.innerHTML += `<option value="${p}">${p}</option>`);
}

function mostrar() {
    let tipo = document.getElementById('tipoRel').value;
    let filtro = document.getElementById('filtroVeiculo').value;
    let dataI = document.getElementById('dataInicial').value;
    let dataF = document.getElementById('dataFinal').value;

    let dados = [...abastecimentos];
    if(filtro) dados = dados.filter(d => d.PLACA === filtro);
    if(dataI) dados = dados.filter(d => d.DATA >= dataI);
    if(dataF) dados = dados.filter(d => d.DATA <= dataF);
    dados.sort((a,b) => new Date(b.DATA) - new Date(a.DATA));

    let html = '';
    if(tipo === 'lista') {
        html = `<table><tr><th>DATA</th><th>VEICULO</th><th>PLACA</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>AÇÃO</th></tr>`;
        html += dados.map((d, i) => {
            let indexOriginal = abastecimentos.indexOf(d);
            let dataFormatada = d.DATA? new Date(d.DATA).toLocaleDateString('pt-BR') : '';
            let nomeVeiculo = d.NOME_VEICULO || 'NÃO INFORMADO';
            return `<tr><td>${dataFormatada}</td><td>${nomeVeiculo}</td><td>${d.PLACA}</td><td>${d.MOTORISTA}</td><td>${d.LITROS}</td><td>R$ ${parseFloat(d.VALOR).toFixed(2)}</td><td>${d.KM}</td><td><button onclick="pedirSenha(${indexOriginal})" class="btn-excluir">EXCLUIR</button></td></tr>`
        }).join('');
        html += '</table>';
    }
    if(tipo === 'consumo') {
        let resumo = {};
        dados.forEach(d => {
            let nomeVeiculo = d.NOME_VEICULO || 'NÃO INFORMADO';
            if(!resumo[d.PLACA]) resumo[d.PLACA] = {nome: nomeVeiculo, litros: 0, valor: 0, kmInicial: 999, kmFinal: 0};
            resumo[d.PLACA].litros += parseFloat(d.LITROS);
            resumo[d.PLACA].valor += parseFloat(d.VALOR);
            if(parseInt(d.KM) < resumo[d.PLACA].kmInicial) resumo[d.PLACA].kmInicial = parseInt(d.KM);
            if(parseInt(d.KM) > resumo[d.PLACA].kmFinal) resumo[d.PLACA].kmFinal = parseInt(d.KM);
        });
        html = `<table><tr><th>VEICULO</th><th>KM RODADOS</th><th>TOTAL LITROS</th><th>TOTAL R$</th><th>KM/L</th><th>R$/KM</th></tr>`;
        for(let placa in resumo) {
            let r = resumo[placa];
            let kmRodados = r.kmFinal - r.kmInicial;
            let kml = kmRodados > 0 && r.litros > 0? kmRodados / r.litros : 0;
            let rskm = kmRodados > 0? r.valor / kmRodados : 0;
            html += `<tr><td>${r.nome} - ${placa}</td><td>${kmRodados}</td><td>${r.litros.toFixed(2)}</td><td>R$ ${r.valor.toFixed(2)}</td><td>${kml.toFixed(2)}</td><td>R$ ${rskm.toFixed(2)}</td></tr>`;
        }
        html += '</table>';
    }
    document.getElementById('resultado').innerHTML = html;
}

function gerarPDF() {
    let conteudo = document.getElementById('resultado').innerHTML;
    if(conteudo.trim() === '') return alert('GERAR RELATORIO PRIMEIRO');
    let dataAtual = new Date().toLocaleDateString('pt-br');
    let htmlImpressao = `<html><head><title>Relatorio Frota - ${dataAtual}</title><style>body{font-family: 'Segoe UI', Arial; padding:20px} h2{text-align:center; color:#2563eb} table{width:100%; border-collapse:collapse; margin-top:15px} th,td{border:1px solid #cbd5e1; padding:8px; text-align:left; font-size:12px} th{background:#2563eb; color:#fff}</style></head><body><h2>RELATORIO DE ABASTECIMENTO - ${dataAtual}</h2>${conteudo}<script>window.onload = function(){ window.print(); }</script></body></html>`;
    let janela = window.open('', '_blank');
    janela.document.write(htmlImpressao);
    janela.document.close();
}

function pedirSenha(index) {
    indexParaExcluir = index;
    document.getElementById('senhaBox').style.display = 'block';
    document.getElementById('senhaInput').focus();
}

function cancelarExclusao() {
    indexParaExcluir = null;
    document.getElementById('senhaBox').style.display = 'none';
    document.getElementById('senhaInput').value = '';
}

async function confirmarExclusao() {
    let senha = document.getElementById('senhaInput').value;
    if(senha!== SENHA) return alert('SENHA INCORRETA!');
    await fetch(URL_SCRIPT, { method: 'POST', body: JSON.stringify({action: "delete", row: indexParaExcluir}) });
    alert('EXCLUIDO!');
    cancelarExclusao();
    carregar();
}