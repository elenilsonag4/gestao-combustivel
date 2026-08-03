function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

document.addEventListener('DOMContentLoaded', carregarDados);

function carregarDados() {
  google.script.run.withSuccessHandler(preencherSelects).getVeiculos();
  google.script.run.withSuccessHandler(preencherTabela).getHistorico();
}

function preencherSelects(veiculos) {
  const sel1 = document.getElementById('selectVeiculo');
  const sel2 = document.getElementById('selectVeiculoManutencao');
  sel1.innerHTML = '<option>Selecione</option>'; sel2.innerHTML = '<option>Selecione</option>';
  veiculos.forEach(v => {
    sel1.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
    sel2.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });
}

function cadastrarVeiculo() {
  const nome = document.getElementById('nomeVeiculo').value;
  const placa = document.getElementById('placaVeiculo').value;
  google.script.run.withSuccessHandler(() => { alert('Veículo cadastrado!'); carregarDados(); }).cadastrarVeiculo(nome, placa);
}

function editarVeiculo() {
  const nome = document.getElementById('nomeVeiculo').value;
  const placa = document.getElementById('placaVeiculo').value;
  google.script.run.withSuccessHandler(() => { alert('Veículo atualizado!'); carregarDados(); }).editarVeiculo(nome, placa);
}

function registrarAbastecimento() {
  const dados = {
    data: document.getElementById('dataAbastecimento').value,
    placa: document.getElementById('selectVeiculo').value,
    motorista: document.getElementById('motorista').value,
    litros: document.getElementById('litros').value,
    valor: document.getElementById('valorTotal').value,
    km: document.getElementById('kmAtual').value
  };
  google.script.run.withSuccessHandler(() => { alert('Abastecimento registrado!'); carregarDados(); }).registrarAbastecimento(dados);
}

function abrirModalManutencao() { document.getElementById('modalManutencao').style.display = 'block'; }
function fecharModalManutencao() { document.getElementById('modalManutencao').style.display = 'none'; }
function registrarManutencao() { /* função para salvar manutenção */ fecharModalManutencao(); }

function preencherTabela(dados) { /* preenche a tabela do histórico */ }

function gerarPDF(tipo) {
  google.script.run.withSuccessHandler(url => { window.open(url, '_blank'); }).gerarPDF(tipo);
}