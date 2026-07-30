const API_URL = "https://script.google.com/macros/s/AKfycbzr8_dBRPBw73PCja-GkWAhvcIKHexbohMm5bMpNyAQ8OynAXvfGyAFCM8X4pNZTKGYQg/exec";
const SENHA = "frot@AG4";

let veiculos = JSON.parse(localStorage.getItem('veiculos')) || [];
let abastecimentos = [];

// FORÇA MAIUSCULO
document.addEventListener('DOMContentLoaded', () => {
    ['placaNova','nomeVeiculo','motorista'].forEach(id => {
        let el = document.getElementById(id);
        if(el) el.addEventListener('keyup', () => el.value = el.value.toUpperCase());
    });
    carregarDados();
    mudaTipoRel();
});

async function carregarDados() {
    try {
        let res = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({action: "getAll"}),
            headers: {'Content-Type': 'text/plain'}
        });
        abastecimentos = await res.json();
        abastecimentos = abastecimentos.filter(a => a.DATA);
    } catch(e) {
        console.log("Erro ao carregar:", e);
        abastecimentos = [];
    }
    atualizarSelects(); // <--- ESSENCIAL
}

function salvarVeiculos() {
    localStorage.setItem('veiculos', JSON.stringify(veiculos));
    atualizarSelects(); // <--- ESSENCIAL: ATUALIZA A TELA NA HORA
}

function atualizarSelects() {
    veiculos.sort((a, b) => a.nome.localeCompare(b.nome));

    let options = '<option value="">SELECIONE O VEICULO</option>';
    options += veiculos.map(v => `<option value="${v.placa}">${v.nome} - ${v.placa}</option>`).join('');
    if(document.getElementById('selectVeiculo')) document.getElementById('selectVeiculo').innerHTML = options;

    let filtro = '<option value="">TODOS OS VEÍCULOS</option>';
    filtro += veiculos.map(v => `<option value="${v.placa}">${v.nome} - ${v.placa}</option>`).join('');
    if(document.getElementById('filtroVeiculo')) document.getElementById('filtroVeiculo').innerHTML = filtro;

    mostrar();
}

function cadastrarVeiculo() {
    let placa = document.getElementById('placaNova').value.toUpperCase().trim();
    let nome = document.getElementById('nomeVeiculo').value.toUpperCase().trim();
    if(!placa ||!nome) return alert('PREENCHA PLACA E NOME');
    if(veiculos.find(v => v.placa === placa)) return alert('PLACA JÁ CADASTRADA');

    veiculos.push({placa, nome});
    salvarVeiculos(); // <--- AGORA SALVA E ATUALIZA
    alert('VEÍCULO CADASTRADO!');
    document.getElementById('placaNova').value = '';
    document.getElementById('nomeVeiculo').value = '';
}

function abrirModal() { document.getElementById('modal').style.display = 'flex'; }
function fecharModal() { document.getElementById('modal').style.display = 'none'; }

function abrirModalVeiculos() {
    document.getElementById('modalVeiculos').style.display = 'flex';
    listarVeiculosCadastrados();
}
function fecharModalVeiculos() {
    document.getElementById('modalVeiculos').style.display = 'none';
}

function listarVeiculosCadastrados() {
    let html = '';
    if(veiculos.length === 0) {
        html = '<p>NENHUM VEÍCULO CADASTRADO</p>';
    } else {
        veiculos.forEach((v, index) => {
            html += `
            <div class="item-veiculo">
                <span><b>${v.nome}</b> - ${v.placa}</span>
                <div class="botoes-lista">
                    <button class="btn-editar" onclick="editarVeiculo(${index})">EDITAR</button>
                    <button class="btn-excluir" onclick="excluirVeiculo(${index})">EXCLUIR</button>
                </div>
            </div>`;
        });
    }
    document.getElementById('listaVeiculosCadastrados').innerHTML = html;
}

function editarVeiculo(index) {
    let senha = prompt('DIGITE A SENHA PARA EDITAR VEÍCULO:');
    if(senha!== SENHA) { if(senha) alert('SENHA INCORRETA!'); return; }

    let v = veiculos[index];
    let novoNome = prompt('EDITAR NOME DO VEÍCULO:', v.nome);
    if(novoNome) {
        let novaPlaca = prompt('EDITAR PLACA DO VEÍCULO:', v.placa);
        if(novaPlaca) {
            abastecimentos.forEach(a => {
                if(a.PLACA === v.placa) {
                    a.PLACA = novaPlaca.toUpperCase();
                    a.NOME_VEICULO = novoNome.toUpperCase();
                }
            });
            veiculos[index] = {nome: novoNome.toUpperCase(), placa: novaPlaca.toUpperCase()};
            salvarVeiculos();
            alert('VEÍCULO ATUALIZADO!');
            listarVeiculosCadastrados();
        }
    }
}

function excluirVeiculo(index) {
    let senha = prompt('DIGITE A SENHA PARA EXCLUIR VEÍCULO:');
    if(senha!== SENHA) { if(senha) alert('SENHA INCORRETA!'); return; }
    if(!confirm('TEM CERTEZA? ISSO NÃO EXCLUI OS ABASTECIMENTOS DESSE VEÍCULO')) return;

    veiculos.splice(index, 1);
    salvarVeiculos();
    alert('VEÍCULO EXCLUÍDO!');
    listarVeiculosCadastrados();
}

async function salvar() {
    let veiculoSelecionado = veiculos.find(v => v.placa === document.getElementById('selectVeiculo').value);
    if(!veiculoSelecionado) return alert('SELECIONE UM VEICULO');

    let novo = {
        action: "add",
        placa: veiculoSelecionado.placa,
        data: document.getElementById('data').value,
        nome: veiculoSelecionado.nome,
        motorista: document.getElementById('motorista').value.toUpperCase().trim(),
        litros: parseFloat(document.getElementById('litros').value),
        valor: parseFloat(document.getElementById('valor').value),
        km: parseInt(document.getElementById('km').value)
    };
    if(!novo.data ||!novo.litros) return alert('PREENCHA DATA E LITROS');

    await fetch(API_URL, { method: 'POST', body: JSON.stringify(novo), headers: {'Content-Type': 'text/plain'} });
    alert('ABASTECIMENTO SALVO NA NUVEM!');
    document.getElementById('motorista').value = '';
    document.getElementById('litros').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('km').value = '';
    fecharModal();
    carregarDados();
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
            return `<tr><td>${d.DATA.split('-').reverse().join('/')}</td><td>${d.NOME_VEICULO}</td><td>${d.PLACA}</td><td>${d.MOTORISTA}</td><td>${d.LITROS}</td><td>R$ ${parseFloat(d.VALOR).toFixed(2)}</td><td>${d.KM}</td><td><button onclick="pedirSenha(${indexOriginal})" class="btn-excluir">EXCLUIR</button></td></tr>`
        }).join('');
        html += '</table>';
    }
    if(tipo === 'consumo') {
        let resumo = {};
        dados.forEach(d => {
            if(!resumo[d.PLACA]) resumo[d.PLACA] = {nome: d.NOME_VEICULO, litros: 0, valor: 0, kmInicial: 999999, kmFinal: 0};
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

function pedirSenha(index) {
    let senha = prompt('DIGITE A SENHA PARA EXCLUIR ABASTECIMENTO:');
    if(senha === SENHA) excluirItem(index);
    else if(senha) alert('SENHA INCORRETA!');
}

async function excluirItem(index) {
    if(!confirm('TEM CERTEZA QUE DESEJA EXCLUIR?')) return;
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({action: "delete", row: index}), headers: {'Content-Type': 'text/plain'} });
    alert('EXCLUÍDO!');
    carregarDados();
}

function gerarPDF() {
    let conteudo = document.getElementById('resultado').innerHTML;
    if(conteudo.trim() === '') return alert('GERAR RELATÓRIO PRIMEIRO');
    let dataAtual = new Date().toLocaleDateString('pt-br');
    let htmlImpressao = `<html><head><title>Relatorio Frota - ${dataAtual}</title><style>body{font-family: 'Segoe UI', Arial; padding:20px} h2{text-align:center; color:#2563eb} table{width:100%; border-collapse:collapse; margin-top:15px} th,td{border:1px solid #cbd5e1; padding:8px; text-align:left; font-size:12px} th{background:#2563eb; color:#fff}</style></head><body><h2>RELATORIO DE ABASTECIMENTO - ${dataAtual}</h2>${conteudo}<script>window.onload = function(){ window.print(); }</script></body></html>`;
    let janela = window.open('', '_blank');
    janela.document.write(htmlImpressao);
    janela.document.close();
}

function mudaTipoRel() {
    let tipo = document.getElementById('tipoRel').value;
    document.getElementById('filtroVeiculo').style.display = tipo === 'consumo'? 'none' : 'block';
}