document.addEventListener('DOMContentLoaded', carregarDados);

function carregarDados() {
  google.script.run.withSuccessHandler(preencherSelects).getVeiculos();
  google.script.run.withSuccessHandler(preencherTabela).getHistorico();
}

function preencherSelects(veiculos) {
  const sel1 = document.getElementById('selectVeiculo');
  const sel2 = document.getElementById('selectVeiculoManutencao');
  sel1.innerHTML = '<option value="">Selecione</option>';
  sel2.innerHTML = '<option value="">Selecione</option>';
  veiculos.forEach(v => {
    const option = new Option(`${v.nome} - ${v.placa}`, v.placa);
    sel1.add(option);
    sel2.add(option.cloneNode(true));
  });
}

function cadastrarVeiculo() {
  const nome = document.getElementById('nomeVeiculo').value.trim();
  const placa = document.getElementById('placaVeiculo').value.trim();
  if(!nome ||!placa) return alert('Preencha Nome e Placa');
  google.script.run.withSuccessHandler(() => {
    alert('Veículo cadastrado com sucesso!');
    document.getElementById('nomeVeiculo').value='';
    document.getElementById('placaVeiculo').value='';
    carregarDados();
  }).cadastrarVeiculo(nome, placa);
}

function editarVeiculo() {
  const nome = document.getElementById('nomeVeiculo').value.trim();
  const placa = document.getElementById('placaVeiculo').value.trim();
  if(!nome ||!placa) return alert('Preencha Nome e Placa do veículo a editar');
  google.script.run.withSuccessHandler(() => {
    alert('Veículo atualizado!');
    carregarDados();
  }).editarVeiculo(nome, placa);
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
  if(!dados.data ||!dados.placa) return alert('Preencha Data e Veículo');
  google.script.run.withSuccessHandler(() => {
    alert('Abastecimento registrado!');
    document.querySelectorAll('#dataAbastecimento, #motorista, #litros, #valorTotal, #kmAtual').forEach(i => i.value='');
    carregarDados();
  }).registrarAbastecimento(dados);
}

function abrirModalManutencao() { document.getElementById('modalManutencao').style.display = 'block'; }
function fecharModalManutencao() { document.getElementById('modalManutencao').style.display = 'none'; }
function registrarManutencao() { alert('Função de manutenção será implementada na planilha'); fecharModalManutencao(); }

function preencherTabela(dados) {
  const tbody = document.querySelector('#tabelaHistorico tbody');
  tbody.innerHTML = '';
  if(dados.length === 0){ tbody.innerHTML = '<tr><td colspan="9">Nenhum abastecimento registrado</td></tr>'; return; }
  dados.forEach(l => {
    const tr = tbody.insertRow();
    l.forEach(cel => tr.insertCell().innerText = cel);
    tr.insertCell().innerHTML = '<button>MAIS</button>';
  });
}

function gerarPDF(tipo) {
  google.script.run.withSuccessHandler(url => { window.open(url, '_blank'); }).gerarPDF(tipo);
}