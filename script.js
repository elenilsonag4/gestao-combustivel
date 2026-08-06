// ==========================================
// CONFIGURAÇÃO DO GOOGLE APPS SCRIPT
// ==========================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyrVFsj93t28549rI7BS69hkQZK1cSjwRBE7yTDBqPST2ljly9HsMX5ztGsfypWoVlE/exec";

// Função para enviar os dados para a planilha em segundo plano
function enviarParaGoogleSheets(acao, payload) {
  fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors", // Permite envio sem erros de CORS
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ acao: acao, dados: payload })
  }).catch(err => console.error("Erro ao sincronizar com Google Sheets:", err));
}

// ==========================================
// INICIALIZAÇÃO E BANCO DE DADOS LOCAL
// ==========================================

document.addEventListener('DOMContentLoaded', carregarDados);

let DB = JSON.parse(localStorage.getItem('ag4_frota')) || { veiculos: [], abastecimento: [], manutencao: [] };

function salvarDB() { 
  localStorage.setItem('ag4_frota', JSON.stringify(DB)); 
}

let listaVeiculosGlobal = [];
let abaAtiva = 'abastecimento';

// CONSTANTE DA SENHA MESTRE
const SENHA_MESTRE = "frot@AG4";

function confirmarSenha() {
  const senhaDigitada = prompt("DIGITE A SENHA DE CONFIRMAÇÃO PARA CONTINUAR:");
  if (senhaDigitada === null) return false;
  if (senhaDigitada === SENHA_MESTRE) {
    return true;
  } else {
    alert("SENHA INCORRETA! AÇÃO NÃO PERMITIDA.");
    return false;
  }
}

// Converter texto para maiúsculo automaticamente
document.addEventListener('input', function(e) { 
  if(e.target.type === 'text') { 
    e.target.value = e.target.value.toUpperCase(); 
  } 
});

function carregarDados() {
  listaVeiculosGlobal = DB.veiculos;
  recalcularConsumoHistorico();
  preencherSelects(DB.veiculos);
  renderizarTabela();
}

function preencherSelects(veiculos) {
  const sel1 = document.getElementById('selectVeiculo');
  const sel2 = document.getElementById('selectVeiculoManutencao');
  
  if (sel1) {
    sel1.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    veiculos.forEach(v => sel1.add(new Option(`${v.nome} - ${v.placa}`, v.placa)));
  }
  
  if (sel2) {
    sel2.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    veiculos.forEach(v => sel2.add(new Option(`${v.nome} - ${v.placa}`, v.placa)));
  }
}

// ==========================================
// GERENCIAMENTO DE VEÍCULOS
// ==========================================

function cadastrarVeiculo() {
  const nome = document.getElementById('nomeVeiculo').value.trim();
  const placa = document.getElementById('placaVeiculo').value.trim();
  if(!nome || !placa) return alert('PREENCHA NOME E PLACA');
  
  const existe = DB.veiculos.find(v => v.placa === placa.toUpperCase());
  if(existe) return alert('PLACA JÁ CADASTRADA');
  
  const novoVeiculo = { nome: nome.toUpperCase(), placa: placa.toUpperCase() };
  DB.veiculos.push(novoVeiculo);
  
  salvarDB();
  enviarParaGoogleSheets('cadastrarVeiculo', novoVeiculo); // Nuvem
  
  alert('VEÍCULO CADASTRADO COM SUCESSO!');
  document.getElementById('nomeVeiculo').value = '';
  document.getElementById('placaVeiculo').value = '';
  carregarDados();
}

function abrirModalEditar() { 
  preencherSelectEditar(); 
  const modal = document.getElementById('modalEditarVeiculo');
  if(modal) modal.style.display = 'block'; 
}

function fecharModalEditar() { 
  const modal = document.getElementById('modalEditarVeiculo');
  if(modal) modal.style.display = 'none'; 
  
  if(document.getElementById('selectVeiculoEditar')) document.getElementById('selectVeiculoEditar').value = ''; 
  if(document.getElementById('nomeVeiculoEditar')) document.getElementById('nomeVeiculoEditar').value = ''; 
  if(document.getElementById('placaVeiculoEditar')) document.getElementById('placaVeiculoEditar').value = ''; 
}

function preencherSelectEditar() {
  const sel = document.getElementById('selectVeiculoEditar');
  if(!sel) return;
  sel.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
  listaVeiculosGlobal.forEach(v => { 
    sel.add(new Option(`${v.nome} - ${v.placa}`, v.placa)); 
  });
}

function carregarDadosEdicao() {
  const placa = document.getElementById('selectVeiculoEditar').value;
  const veiculo = listaVeiculosGlobal.find(v => v.placa === placa);
  if(veiculo) { 
    document.getElementById('nomeVeiculoEditar').value = veiculo.nome; 
    document.getElementById('placaVeiculoEditar').value = veiculo.placa; 
  } else { 
    document.getElementById('nomeVeiculoEditar').value = ''; 
    document.getElementById('placaVeiculoEditar').value = ''; 
  }
}

function salvarEdicaoVeiculo() {
  const placaAntiga = document.getElementById('selectVeiculoEditar').value;
  const nomeNovo = document.getElementById('nomeVeiculoEditar').value.trim().toUpperCase();
  const placaNova = document.getElementById('placaVeiculoEditar').value.trim().toUpperCase();
  
  if(!placaAntiga || !nomeNovo || !placaNova) return alert('PREENCHA TODOS OS CAMPOS');
  if(!confirmarSenha()) return;

  const index = DB.veiculos.findIndex(v => v.placa === placaAntiga.toUpperCase());
  
  if(index > -1) { 
    DB.veiculos[index].nome = nomeNovo; 
    DB.veiculos[index].placa = placaNova; 

    if (DB.abastecimento) {
      DB.abastecimento.forEach(registro => {
        if (registro[1] === placaAntiga) {
          registro[1] = placaNova;
          registro[2] = nomeNovo;
        }
      });
    }

    if (DB.manutencao) {
      DB.manutencao.forEach(registro => {
        if (registro[1] === placaAntiga) {
          registro[1] = placaNova;
          registro[2] = nomeNovo;
        }
      });
    }

    recalcularConsumoHistorico();
    salvarDB(); 
    
    enviarParaGoogleSheets('editarVeiculo', { placaAntiga, nomeNovo, placaNova }); // Nuvem
    
    alert('VEÍCULO E HISTÓRICOS ATUALIZADOS COM SUCESSO!'); 
    fecharModalEditar(); 
    carregarDados(); 
  } else { 
    alert('VEÍCULO NÃO ENCONTRADO'); 
  }
}

function excluirVeiculo() {
  const placa = document.getElementById('selectVeiculoEditar').value;

  if (!placa) return alert('SELECIONE UM VEÍCULO PARA EXCLUIR!');

  const confirmacao = confirm(`TEM CERTEZA QUE DESEJA EXCLUIR O VEÍCULO DE PLACA ${placa}?\n\nATENÇÃO: Todos os abastecimentos e manutenções vinculados a ele também serão excluídos.`);
  if (!confirmacao) return;
  if (!confirmarSenha()) return;

  DB.veiculos = DB.veiculos.filter(v => v.placa !== placa);
  DB.abastecimento = DB.abastecimento.filter(a => a[1] !== placa);
  DB.manutencao = (DB.manutencao || []).filter(m => m[1] !== placa);

  salvarDB();
  enviarParaGoogleSheets('excluirVeiculo', { placa }); // Nuvem
  
  alert('VEÍCULO EXCLUÍDO COM SUCESSO!');
  fecharModalEditar(); 
  carregarDados();
}

// ==========================================
// CÁLCULO DE CONSUMO DE COMBUSTÍVEL
// ==========================================

function calcularConsumoRegistro(placa, kmAtual, litros, idIgnorado = null) {
  kmAtual = parseFloat(kmAtual) || 0;
  litros = parseFloat(litros) || 0;

  if (litros <= 0 || kmAtual <= 0) return "0.00";

  const historicoPlaca = DB.abastecimento
    .filter((a, index) => a[1] === placa && index !== idIgnorado)
    .sort((a, b) => parseFloat(a[6]) - parseFloat(b[6]));

  const abastecimentoAnterior = historicoPlaca
    .filter(a => parseFloat(a[6]) < kmAtual)
    .pop();

  if (!abastecimentoAnterior) return "-";

  const kmAnterior = parseFloat(abastecimentoAnterior[6]);
  const kmRodado = kmAtual - kmAnterior;

  if (kmRodado <= 0) return "0.00";

  return (kmRodado / litros).toFixed(2);
}

function recalcularConsumoHistorico() {
  if (!DB.abastecimento) return;

  DB.abastecimento.sort((a, b) => parseFloat(a[6]) - parseFloat(b[6]));

  DB.abastecimento.forEach((registro, index) => {
    const placa = registro[1];
    const litros = registro[4];
    const kmAtual = registro[6];

    registro[7] = calcularConsumoRegistro(placa, kmAtual, litros, index);
  });

  salvarDB();
}

// ==========================================
// REGISTRO DE ABASTECIMENTO
// ==========================================

function registrarAbastecimento() {
  const sel = document.getElementById('selectVeiculo');
  const data = document.getElementById('dataAbastecimento').value;
  const placa = sel.value;
  const nome = sel.selectedOptions[0]?.text.split(' - ')[0] || '';
  const motorista = document.getElementById('motorista').value;
  const litros = parseFloat(document.getElementById('litros').value) || 0;
  const valor = parseFloat(document.getElementById('valorTotal').value) || 0;
  const kmAtual = parseFloat(document.getElementById('kmAtual').value) || 0;
  
  if (!data || !placa) return alert('PREENCHA DATA E VEÍCULO');
  if (litros <= 0 || kmAtual <= 0) return alert('PREENCHA LITROS E KM ATUAL COM VALORES VÁLIDOS');

  const consumo = calcularConsumoRegistro(placa, kmAtual, litros);
  const registro = [data, placa, nome, motorista, litros, valor, kmAtual, consumo];
  
  DB.abastecimento.push(registro);
  recalcularConsumoHistorico();
  
  enviarParaGoogleSheets('registrarAbastecimento', registro); // Nuvem
  
  alert('ABASTECIMENTO REGISTRADO!');
  document.querySelectorAll('#dataAbastecimento, #motorista, #litros, #valorTotal, #kmAtual').forEach(i => i.value = '');
  document.getElementById('dataAbastecimento').valueAsDate = new Date();
  
  carregarDados();
}

// ==========================================
// REGISTRO DE MANUTENÇÃO
// ==========================================

function abrirModalManutencao() { 
  const modal = document.getElementById('modalManutencao');
  if(modal) modal.style.display = 'block'; 
  if(document.getElementById('dataManutencao')) document.getElementById('dataManutencao').valueAsDate = new Date(); 
}

function fecharModalManutencao() { 
  const modal = document.getElementById('modalManutencao');
  if(modal) modal.style.display = 'none'; 
  
  ['selectVeiculoManutencao', 'nomeVeiculoManutencao', 'tipoManutencao', 'kmManutencao', 'proximaTrocaKm'].forEach(id => {
    if(document.getElementById(id)) document.getElementById(id).value = '';
  });
}

function carregarNomeVeiculo() { 
  const placa = document.getElementById('selectVeiculoManutencao').value; 
  const veiculo = listaVeiculosGlobal.find(v => v.placa === placa); 
  if(document.getElementById('nomeVeiculoManutencao')) {
    document.getElementById('nomeVeiculoManutencao').value = veiculo ? veiculo.nome : ''; 
  }
}

function registrarManutencao() {
  const dados = [
    document.getElementById('dataManutencao').value, 
    document.getElementById('selectVeiculoManutencao').value, 
    document.getElementById('nomeVeiculoManutencao').value, 
    document.getElementById('tipoManutencao').value, 
    document.getElementById('kmManutencao').value, 
    document.getElementById('proximaTrocaKm').value 
  ];
  
  if(!dados[0] || !dados[1] || !dados[3]) return alert('PREENCHA DATA, VEÍCULO E TIPO');
  if(!DB.manutencao) DB.manutencao = [];
  
  DB.manutencao.push(dados);
  salvarDB();
  
  enviarParaGoogleSheets('registrarManutencao', dados); // Nuvem
  
  alert('MANUTENÇÃO REGISTRADA!');
  fecharModalManutencao();
  carregarDados();
}

// ==========================================
// ABAS E TABELAS
// ==========================================

function trocarAba(aba) {
  abaAtiva = aba;

  const btnAbast = document.getElementById('btnTabAbastecimento');
  const btnManut = document.getElementById('btnTabManutencao');

  if(btnAbast) btnAbast.classList.toggle('active', aba === 'abastecimento');
  if(btnManut) btnManut.classList.toggle('active', aba === 'manutencao');

  renderizarTabela();
}

function renderizarTabela() {
  if (abaAtiva === 'abastecimento') {
    preencherTabelaAbastecimento(DB.abastecimento);
  } else {
    preencherTabelaManutencao(DB.manutencao || []);
  }
}

function preencherTabelaAbastecimento(dados) {
  const thead = document.getElementById('cabecalhoTabela');
  const tbody = document.querySelector('#tabelaHistorico tbody');
  
  if(!thead || !tbody) return;

  thead.innerHTML = `
    <th>DATA</th>
    <th>PLACA</th>
    <th>VEÍCULO</th>
    <th>MOTORISTA</th>
    <th>LITROS</th>
    <th>VALOR</th>
    <th>KM</th>
    <th>CONSUMO</th>
    <th>AÇÕES</th>
  `;

  tbody.innerHTML = '';

  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9">NENHUM ABASTECIMENTO REGISTRADO</td></tr>';
    return;
  }

  dados.forEach((l, index) => {
    const tr = tbody.insertRow();
    tr.insertCell().innerText = l[0]; 
    tr.insertCell().innerText = l[1]; 
    tr.insertCell().innerText = l[2]; 
    tr.insertCell().innerText = l[3]; 
    tr.insertCell().innerText = `${parseFloat(l[4]).toFixed(2)} L`; 
    tr.insertCell().innerText = `R$ ${parseFloat(l[5]).toFixed(2)}`; 
    tr.insertCell().innerText = `${l[6]} KM`; 
    tr.insertCell().innerText = l[7] !== '-' ? `${l[7]} KM/L` : '-';
    
    const tdAcao = tr.insertCell();
    tdAcao.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-primary" style="padding:4px 8px; font-size:11px" onclick="toggleDropdown(event, 'abast_${index}')">MAIS</button>
        <div class="dropdown-content" id="dropdownabast_${index}">
          <button onclick="abrirModalEditarAbastecimento(${index})">EDITAR</button>
          <button onclick="excluirAbastecimento(${index})">EXCLUIR</button>
        </div>
      </div>`;
  });
}

function preencherTabelaManutencao(dados) {
  const thead = document.getElementById('cabecalhoTabela');
  const tbody = document.querySelector('#tabelaHistorico tbody');
  
  if(!thead || !tbody) return;

  thead.innerHTML = `
    <th>DATA</th>
    <th>PLACA</th>
    <th>VEÍCULO</th>
    <th>TIPO SERVIÇO</th>
    <th>KM ATUAL</th>
    <th>PRÓX. TROCA</th>
    <th>AÇÕES</th>
  `;

  tbody.innerHTML = '';

  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">NENHUMA MANUTENÇÃO REGISTRADA</td></tr>';
    return;
  }

  dados.forEach((l, index) => {
    const tr = tbody.insertRow();
    tr.insertCell().innerText = l[0]; 
    tr.insertCell().innerText = l[1]; 
    tr.insertCell().innerText = l[2]; 
    tr.insertCell().innerText = l[3]; 
    tr.insertCell().innerText = l[4] ? `${l[4]} KM` : '-'; 
    tr.insertCell().innerText = l[5] ? `${l[5]} KM` : '-'; 
    
    const tdAcao = tr.insertCell();
    tdAcao.innerHTML = `
      <div class="dropdown">
        <button class="btn btn-primary" style="padding:4px 8px; font-size:11px" onclick="toggleDropdown(event, 'manut_${index}')">MAIS</button>
        <div class="dropdown-content" id="dropdownmanut_${index}">
          <button onclick="excluirManutencao(${index})">EXCLUIR</button>
        </div>
      </div>`;
  });
}

function toggleDropdown(event, idStr) {
  event.stopPropagation();
  const menu = document.getElementById('dropdown' + idStr);
  const estaAberto = menu.style.display === 'block';

  document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');

  if (!estaAberto) {
    menu.style.display = 'block';
  }
}

window.onclick = function(event) {
  if (!event.target.closest('.dropdown')) {
    document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
  }
};

// ==========================================
// EDIÇÃO E EXCLUSÃO DO HISTÓRICO
// ==========================================

function excluirAbastecimento(index) { 
  if(confirm('TEM CERTEZA QUE DESEJA EXCLUIR ESTE ABASTECIMENTO?')) { 
    if(!confirmarSenha()) return;

    const itemRemovido = DB.abastecimento.splice(index, 1)[0]; 
    recalcularConsumoHistorico();
    
    enviarParaGoogleSheets('excluirAbastecimento', { index, item: itemRemovido }); // Nuvem
    
    alert('ABASTECIMENTO EXCLUÍDO!'); 
    carregarDados(); 
  } 
}

function excluirManutencao(index) {
  if (confirm('TEM CERTEZA QUE DESEJA EXCLUIR ESTA MANUTENÇÃO?')) {
    if (!confirmarSenha()) return;

    const itemRemovido = DB.manutencao.splice(index, 1)[0];
    salvarDB();
    
    enviarParaGoogleSheets('excluirManutencao', { index, item: itemRemovido }); // Nuvem
    
    alert('MANUTENÇÃO EXCLUÍDA!');
    carregarDados();
  }
}

function abrirModalEditarAbastecimento(index) {
  const abastecimento = DB.abastecimento[index];
  if(!abastecimento) return;
  
  if(!document.getElementById('modalEditarAbastecimento')) { 
    criarModalEditarAbastecimento(); 
  }
  
  const sel = document.getElementById('editSelectVeiculo');
  sel.innerHTML = '';
  listaVeiculosGlobal.forEach(v => { 
    sel.add(new Option(`${v.nome} - ${v.placa}`, v.placa)); 
  });

  document.getElementById('editAbastIndex').value = index;
  document.getElementById('editDataAbastecimento').value = abastecimento[0];
  document.getElementById('editSelectVeiculo').value = abastecimento[1];
  document.getElementById('editMotorista').value = abastecimento[3];
  document.getElementById('editLitros').value = abastecimento[4];
  document.getElementById('editValorTotal').value = abastecimento[5];
  document.getElementById('editKmAtual').value = abastecimento[6];
  document.getElementById('modalEditarAbastecimento').style.display = 'block';
}

function fecharModalEditarAbastecimento() { 
  const modal = document.getElementById('modalEditarAbastecimento');
  if(modal) modal.style.display = 'none'; 
}

function salvarEdicaoAbastecimento() {
  const index = parseInt(document.getElementById('editAbastIndex').value);
  const data = document.getElementById('editDataAbastecimento').value;
  const placa = document.getElementById('editSelectVeiculo').value;
  const nome = document.getElementById('editSelectVeiculo').selectedOptions[0]?.text.split(' - ')[0] || '';
  const motorista = document.getElementById('editMotorista').value;
  const litros = parseFloat(document.getElementById('editLitros').value) || 0;
  const valor = parseFloat(document.getElementById('editValorTotal').value) || 0;
  const kmAtual = parseFloat(document.getElementById('editKmAtual').value) || 0;
  
  if (!data || !placa) return alert('PREENCHA DATA E VEÍCULO');
  if (!confirmarSenha()) return;

  const consumo = calcularConsumoRegistro(placa, kmAtual, litros, index);
  const novoRegistro = [data, placa, nome, motorista, litros, valor, kmAtual, consumo];
  
  DB.abastecimento[index] = novoRegistro;
  recalcularConsumoHistorico();
  
  enviarParaGoogleSheets('editarAbastecimento', { index, registro: novoRegistro }); // Nuvem
  
  alert('ABASTECIMENTO ATUALIZADO!');
  fecharModalEditarAbastecimento();
  carregarDados();
}

function criarModalEditarAbastecimento() {
  const modalHTML = `<div id="modalEditarAbastecimento" class="modal"><div class="modal-content"><span class="close" onclick="fecharModalEditarAbastecimento()">&times;</span><h2>EDITAR ABASTECIMENTO</h2><input type="hidden" id="editAbastIndex"><div class="form-group"><label for="editDataAbastecimento">DATA</label><input type="date" id="editDataAbastecimento"></div><div class="form-group"><label for="editSelectVeiculo">VEÍCULO</label><select id="editSelectVeiculo"></select></div><div class="grid-2"><div class="form-group"><label for="editMotorista">MOTORISTA</label><input type="text" id="editMotorista"></div><div class="form-group"><label for="editLitros">LITROS</label><input type="number" step="0.01" id="editLitros"></div></div><div class="grid-2"><div class="form-group"><label for="editValorTotal">VALOR TOTAL R$</label><input type="number" step="0.01" id="editValorTotal"></div><div class="form-group"><label for="editKmAtual">KM ATUAL</label><input type="number" id="editKmAtual"></div></div><div class="btn-group"><button class="btn btn-primary" onclick="salvarEdicaoAbastecimento()">SALVAR</button><button class="btn btn-primary" onclick="fecharModalEditarAbastecimento()">CANCELAR</button></div></div></div>`;
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// ==========================================
// EMISSÃO DE RELATÓRIOS PDF
// ==========================================

function gerarHTMLPDF(dados, titulo) {
  dados.sort((a, b) => { 
    if(a[2] < b[2]) return -1; 
    if(a[2] > b[2]) return 1; 
    return new Date(a[0]) - new Date(b[0]); 
  });

  const totalAbastecimentos = dados.length;
  const totalLitros = dados.reduce((acc, curr) => acc + (parseFloat(curr[4]) || 0), 0);
  const totalValor = dados.reduce((acc, curr) => acc + (parseFloat(curr[5]) || 0), 0);

  let linhasTabela = ''; 
  let veiculoAtual = '';

  dados.forEach(l => { 
    if(veiculoAtual !== l[2]) { 
      veiculoAtual = l[2]; 
      linhasTabela += `
        <tr class="cabecalho-veiculo">
          <td colspan="8">🚙 VEÍCULO: ${l[2]} — PLACA: ${l[1]}</td>
        </tr>`; 
    }

    const dataFormatada = l[0].includes('-') ? l[0].split('-').reverse().join('/') : l[0];
    const consumoTexto = l[7] !== '-' ? `${l[7]} KM/L` : '-';

    linhasTabela += `
      <tr>
        <td>${dataFormatada}</td>
        <td><strong>${l[1]}</strong></td>
        <td>${l[2]}</td>
        <td>${l[3] || '-'}</td>
        <td>${parseFloat(l[4]).toFixed(2)} L</td>
        <td class="valor">R$ ${parseFloat(l[5]).toFixed(2)}</td>
        <td>${l[6]} KM</td>
        <td><span class="badge-consumo">${consumoTexto}</span></td>
      </tr>`; 
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 30px; color: #2c3e50; background: #fff; }
    .header-pdf { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
    .header-pdf h1 { color: #1565c0; font-size: 20px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
    .header-pdf .sub { font-size: 11px; color: #666; margin-top: 4px; }
    .cards-resumo { display: flex; gap: 15px; margin-bottom: 25px; }
    .card-resumo { flex: 1; background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #1565c0; padding: 10px 15px; border-radius: 4px; }
    .card-resumo span { display: block; font-size: 10px; color: #6c757d; text-transform: uppercase; font-weight: 700; }
    .card-resumo strong { font-size: 16px; color: #1565c0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #1565c0; color: #ffffff; padding: 10px 8px; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    td { padding: 8px; border-bottom: 1px solid #eef2f5; text-align: center; }
    tr:nth-child(even):not(.cabecalho-veiculo) { background-color: #fcfcfc; }
    .cabecalho-veiculo td { background: #e3f2fd !important; font-weight: 700; color: #0d47a1; padding: 10px; font-size: 11px; text-align: left; border-top: 2px solid #bbdefb; }
    .valor { font-weight: 700; color: #2e7d32; }
    .badge-consumo { background: #e8f5e9; color: #2e7d32; padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 10px; }
    .footer-pdf { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } .badge-consumo { border: 1px solid #2e7d32; } @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header-pdf">
    <div>
      <h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1>
      <div class="sub">${titulo}</div>
    </div>
    <div style="text-align: right;">
      <div class="sub">Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  </div>
  <div class="cards-resumo">
    <div class="card-resumo"><span>Total Registros</span><strong>${totalAbastecimentos}</strong></div>
    <div class="card-resumo"><span>Total Combustível</span><strong>${totalLitros.toFixed(2)} L</strong></div>
    <div class="card-resumo"><span>Investimento Total</span><strong>R$ ${totalValor.toFixed(2)}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>DATA</th>
        <th>PLACA</th>
        <th>VEÍCULO</th>
        <th>MOTORISTA</th>
        <th>LITROS</th>
        <th>VALOR TOTAL</th>
        <th>KM ATUAL</th>
        <th>CONSUMO</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela}
    </tbody>
  </table>
  <div class="footer-pdf">
    <span>AG4 FROTA - Sistema de Controle de Frota</span>
    <span>Página 1</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

function gerarHTMLPDFManutencao(dados, titulo) {
  dados.sort((a, b) => { 
    if(a[2] < b[2]) return -1; 
    if(a[2] > b[2]) return 1; 
    return new Date(a[0]) - new Date(b[0]); 
  });

  const totalManutencoes = dados.length;

  let linhasTabela = ''; 
  let veiculoAtual = '';

  dados.forEach(l => { 
    if(veiculoAtual !== l[2]) { 
      veiculoAtual = l[2]; 
      linhasTabela += `
        <tr class="cabecalho-veiculo">
          <td colspan="6">🛠️ VEÍCULO: ${l[2]} — PLACA: ${l[1]}</td>
        </tr>`; 
    }

    const dataFormatada = l[0].includes('-') ? l[0].split('-').reverse().join('/') : l[0];

    linhasTabela += `
      <tr>
        <td>${dataFormatada}</td>
        <td><strong>${l[1]}</strong></td>
        <td>${l[2]}</td>
        <td>${l[3] || '-'}</td>
        <td>${l[4] ? `${l[4]} KM` : '-'}</td>
        <td>${l[5] ? `${l[5]} KM` : '-'}</td>
      </tr>`; 
  });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
    * { box-sizing: border-box; }
    body { font-family: 'Roboto', sans-serif; margin: 0; padding: 30px; color: #2c3e50; background: #fff; }
    .header-pdf { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
    .header-pdf h1 { color: #1565c0; font-size: 20px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
    .header-pdf .sub { font-size: 11px; color: #666; margin-top: 4px; }
    .cards-resumo { display: flex; gap: 15px; margin-bottom: 25px; }
    .card-resumo { flex: 1; background: #f8f9fa; border: 1px solid #e9ecef; border-left: 4px solid #1565c0; padding: 10px 15px; border-radius: 4px; }
    .card-resumo span { display: block; font-size: 10px; color: #6c757d; text-transform: uppercase; font-weight: 700; }
    .card-resumo strong { font-size: 16px; color: #1565c0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th { background: #1565c0; color: #ffffff; padding: 10px 8px; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
    td { padding: 8px; border-bottom: 1px solid #eef2f5; text-align: center; }
    tr:nth-child(even):not(.cabecalho-veiculo) { background-color: #fcfcfc; }
    .cabecalho-veiculo td { background: #e3f2fd !important; font-weight: 700; color: #0d47a1; padding: 10px; font-size: 11px; text-align: left; border-top: 2px solid #bbdefb; }
    .footer-pdf { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } @page { margin: 1.5cm; } }
  </style>
</head>
<body>
  <div class="header-pdf">
    <div>
      <h1>AG4 FROTA — HISTÓRICO DE MANUTENÇÃO</h1>
      <div class="sub">${titulo}</div>
    </div>
    <div style="text-align: right;">
      <div class="sub">Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
    </div>
  </div>
  <div class="cards-resumo">
    <div class="card-resumo"><span>Total de Manutenções</span><strong>${totalManutencoes}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>DATA</th>
        <th>PLACA</th>
        <th>VEÍCULO</th>
        <th>TIPO SERVIÇO</th>
        <th>KM ATUAL</th>
        <th>PRÓX. TROCA</th>
      </tr>
    </thead>
    <tbody>
      ${linhasTabela}
    </tbody>
  </table>
  <div class="footer-pdf">
    <span>AG4 FROTA - Sistema de Controle de Frota</span>
    <span>Página 1</span>
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
}

function abrirNovaAbaComPDF(html) { 
  const aba = window.open('', '_blank'); 
  aba.document.write(html); 
  aba.document.close(); 
}

function gerarPDFGeral() { 
  if (abaAtiva === 'abastecimento') {
    if (!DB.abastecimento || DB.abastecimento.length === 0) return alert('NÃO HÁ DADOS DE ABASTECIMENTO PARA GERAR O PDF'); 
    const html = gerarHTMLPDF(DB.abastecimento, 'RELATÓRIO GERAL DE ABASTECIMENTO'); 
    abrirNovaAbaComPDF(html); 
  } else {
    if (!DB.manutencao || DB.manutencao.length === 0) return alert('NÃO HÁ DADOS DE MANUTENÇÃO PARA GERAR O PDF'); 
    const html = gerarHTMLPDFManutencao(DB.manutencao, 'RELATÓRIO GERAL DE MANUTENÇÃO'); 
    abrirNovaAbaComPDF(html); 
  }
}

function abrirModalSeletiva() {
  const container = document.getElementById('listaCheckboxesVeiculos');
  if(!container) return;
  
  container.innerHTML = '';
  if (listaVeiculosGlobal.length === 0) return alert('NÃO HÁ VEÍCULOS CADASTRADOS');
  
  listaVeiculosGlobal.forEach(v => { 
    const div = document.createElement('div'); 
    div.innerHTML = `<label style="cursor:pointer;"><input type="checkbox" value="${v.placa}"> ${v.nome} - ${v.placa}</label>`; 
    div.style.marginBottom = '8px'; 
    container.appendChild(div); 
  });
  
  const modal = document.getElementById('modalSeletiva');
  if(modal) modal.style.display = 'block';
}

function fecharModalSeletiva() { 
  const modal = document.getElementById('modalSeletiva');
  if(modal) modal.style.display = 'none'; 
}

function gerarPDFSeletiva() {
  const checkboxes = document.querySelectorAll('#listaCheckboxesVeiculos input:checked');
  if (checkboxes.length === 0) return alert('SELECIONE PELO MENOS 1 VEÍCULO');
  
  const placasSelecionadas = Array.from(checkboxes).map(cb => cb.value);
  const nomes = listaVeiculosGlobal.filter(v => placasSelecionadas.includes(v.placa)).map(v => v.nome).join(', ');

  if (abaAtiva === 'abastecimento') {
    const dadosFiltrados = DB.abastecimento.filter(l => placasSelecionadas.includes(l[1]));
    if (dadosFiltrados.length === 0) return alert('NENHUM ABASTECIMENTO ENCONTRADO PARA OS VEÍCULOS SELECIONADOS');
    
    const html = gerarHTMLPDF(dadosFiltrados, `RELATÓRIO SELETIVO ABASTECIMENTO: ${nomes}`);
    abrirNovaAbaComPDF(html);
  } else {
    const dadosFiltrados = (DB.manutencao || []).filter(l => placasSelecionadas.includes(l[1]));
    if (dadosFiltrados.length === 0) return alert('NENHUMA MANUTENÇÃO ENCONTRADA PARA OS VEÍCULOS SELECIONADOS');
    
    const html = gerarHTMLPDFManutencao(dadosFiltrados, `RELATÓRIO SELETIVO MANUTENÇÃO: ${nomes}`);
    abrirNovaAbaComPDF(html);
  }
  
  fecharModalSeletiva();
}