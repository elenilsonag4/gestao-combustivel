// ============================================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// ============================================================
const APPS_SCRIPT_URL = "SUA_URL_DO_WEB_APP_AQUI"; // Cole aqui a URL do seu Web App implantado no Apps Script

let DB = {
  veiculos: [],
  abastecimento: [],
  manutencao: []
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  configurarEventos();
  await carregarDadosIniciais();
});

function configurarEventos() {
  // Troca de Abas
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tabTarget = e.target.getAttribute("data-tab");
      
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      e.target.classList.add("active");
      document.getElementById(tabTarget).classList.add("active");
    });
  });

  // Formulários
  document.getElementById("formVeiculo").addEventListener("submit", cadastrarVeiculo);
  document.getElementById("formAbastecimento").addEventListener("submit", registrarAbastecimento);
  document.getElementById("formManutencao").addEventListener("submit", registrarManutencao);
}

// ============================================================
// COMUNICAÇÃO COM O GOOGLE APPS SCRIPT
// ============================================================
async function enviarParaGoogleSheets(acao, dados) {
  const payload = JSON.stringify({ acao, dados });
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload
    });
    
    const res = await response.json();
    if (!res.ok) {
      console.warn("[AG4] Servidor respondeu com erro:", res.mensagem);
    }
    return res;
  } catch (erro) {
    console.error("[AG4] Erro de comunicação com Google Sheets:", erro);
    alert("Erro ao conectar com o servidor. Verifique sua conexão.");
    return { ok: false, mensagem: erro.message };
  }
}

async function carregarDadosIniciais() {
  try {
    const res = await enviarParaGoogleSheets("obterDados", {});
    if (res && res.ok && res.dados && res.dados.DB) {
      DB = res.dados.DB;
      atualizarInterface();
    } else {
      console.log("Nenhum dado retornado ou falha ao buscar banco.");
    }
  } catch (e) {
    console.error("Erro ao carregar dados do servidor:", e);
  }
}

// ============================================================
// FUNÇÕES DE AÇÃO / CADASTRO
// ============================================================
async function cadastrarVeiculo(e) {
  e.preventDefault();
  const nome = document.getElementById("vecNome").value.trim();
  const placa = document.getElementById("vecPlaca").value.trim().toUpperCase();

  if (!nome || !placa) return alert("Preencha todos os campos do veículo.");

  const novoVeiculo = { nome, placa };
  DB.veiculos.push(novoVeiculo);
  atualizarInterface();
  
  e.target.reset();

  const res = await enviarParaGoogleSheets("cadastrarVeiculo", novoVeiculo);
  if (!res.ok) {
    alert("Falha ao salvar veículo no servidor.");
  }
}

async function registrarAbastecimento(e) {
  e.preventDefault();
  const data = document.getElementById("absData").value;
  const vecIndex = document.getElementById("absVeiculo").value;
  const tipo = document.getElementById("absTipo").value;
  const valor = parseFloat(document.getElementById("absValor").value) || 0;
  const litros = parseFloat(document.getElementById("absLitros").value) || 0;
  const km = parseFloat(document.getElementById("absKm").value) || 0;
  const obs = document.getElementById("absObs").value.trim();

  if (vecIndex === "" || !data) return alert("Selecione um veículo e uma data.");

  const veiculo = DB.veiculos[vecIndex];
  const novoRegistro = [data, veiculo.placa, veiculo.nome, tipo, valor, litros, km, obs || "-"];

  DB.abastecimento.push(novoRegistro);
  atualizarInterface();

  e.target.reset();

  const res = await enviarParaGoogleSheets("registrarAbastecimento", novoRegistro);
  if (!res.ok) {
    alert("Falha ao salvar abastecimento no servidor.");
  }
}

async function registrarManutencao(e) {
  e.preventDefault();
  const data = document.getElementById("manData").value;
  const vecIndex = document.getElementById("manVeiculo").value;
  const tipo = document.getElementById("manTipo").value;
  const hora = document.getElementById("manHora").value;
  const horasAlarme = document.getElementById("manHorasAlarme").value;
  const dataAlarme = document.getElementById("manDataAlarme").value;
  const obsAlarme = document.getElementById("manObsAlarme").value.trim();

  if (vecIndex === "" || !data) return alert("Selecione um veículo e uma data.");

  const veiculo = DB.veiculos[vecIndex];
  const novoRegistro = [
    data,
    veiculo.placa,
    veiculo.nome,
    tipo,
    hora,
    horasAlarme !== "" ? parseFloat(horasAlarme) : "",
    dataAlarme,
    obsAlarme
  ];

  DB.manutencao.push(novoRegistro);
  atualizarInterface();

  e.target.reset();

  const res = await enviarParaGoogleSheets("registrarManutencao", novoRegistro);
  if (!res.ok) {
    alert("Falha ao salvar manutenção no servidor.");
  }
}

// ============================================================
// ATUALIZAÇÃO DA INTERFACE (UI)
// ============================================================
function atualizarInterface() {
  renderizarSeletoresVeiculos();
  renderizarTabelaAbastecimento();
  renderizarTabelaManutencao();
}

function renderizarSeletoresVeiculos() {
  const selAbs = document.getElementById("absVeiculo");
  const selMan = document.getElementById("manVeiculo");

  selAbs.innerHTML = '<option value="">Selecione o Veículo</option>';
  selMan.innerHTML = '<option value="">Selecione o Veículo</option>';

  DB.veiculos.forEach((v, i) => {
    const opt = `<option value="${i}">${v.nome} (${v.placa})</option>`;
    selAbs.innerHTML += opt;
    selMan.innerHTML += opt;
  });
}

function renderizarTabelaAbastecimento() {
  const tbody = document.querySelector("#tabelaAbastecimento tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  DB.abastecimento.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[2]} (${row[1]})</td>
      <td>${row[3]}</td>
      <td>R$ ${Number(row[4]).toFixed(2)}</td>
      <td>${Number(row[5]).toFixed(2)} L</td>
      <td>${row[6]} km</td>
      <td>${row[7]}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderizarTabelaManutencao() {
  const tbody = document.querySelector("#tabelaManutencao tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  DB.manutencao.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row[0]}</td>
      <td>${row[2]} (${row[1]})</td>
      <td>${row[3]}</td>
      <td>${row[4] || "-"}</td>
      <td>${row[5] !== "" ? row[5] + " hrs" : "-"}</td>
      <td>${row[6] || "-"}</td>
      <td>${row[7] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}
