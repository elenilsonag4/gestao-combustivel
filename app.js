// ============================================================
// AG4 FROTA - APLICAÇÃO JS PRINCIPAL
// ============================================================

// URL da sua Web App do Google Apps Script
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw-pr-h9sOshx1qvI7B3G7CrIvZhfq1p3KYlXedW0gZJzsc0Gm7QVK9u4LmrecmaPnAwg/exec";

// Banco de Dados Local / Cache
let DB = {
  veiculos: [
    { placa: "ABC1D23", nome: "FIAT STRADA" },
    { placa: "XYZ9876", nome: "CHEVROLET S10" },
    { placa: "KGM4567", nome: "VOLKSWAGEN DELIVERY" }
  ],
  manutencao: []
};

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
  carregarDBLocal();
  povoarSelectVeiculos();
  carregarDados();
});

// --- HELPER FUNCTIONS ---
function dataHojeInput() {
  const hoje = new Date();
  return hoje.toISOString().split("T")[0];
}

function formatarData(dataStr) {
  if (!dataStr) return "-";
  const partes = dataStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

function salvarDB() {
  localStorage.setItem("AG4_FROTA_DB", JSON.stringify(DB));
}

function carregarDBLocal() {
  const localData = localStorage.getItem("AG4_FROTA_DB");
  if (localData) {
    try {
      DB = JSON.parse(localData);
    } catch (e) {
      console.error("Erro ao carregar do localStorage", e);
    }
  }
}

function povoarSelectVeiculos() {
  const select = document.getElementById("selectVeiculoManutencao");
  if (!select) return;
  
  select.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
  DB.veiculos.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.placa;
    opt.textContent = `${v.placa} - ${v.nome}`;
    select.appendChild(opt);
  });
}

function carregarDados() {
  preencherTabelaManutencao(DB.manutencao);
}

// --- CONTROLE DE DROPDOWN DA TABELA ---
function toggleDropdown(event, id) {
  event.stopPropagation();
  const dropdowns = document.querySelectorAll(".dropdown-content");
  dropdowns.forEach(d => {
    if (d.id !== `dropdown${id}`) d.classList.remove("show");
  });
  const target = document.getElementById(`dropdown${id}`);
  if (target) target.classList.toggle("show");
}

document.addEventListener("click", () => {
  const dropdowns = document.querySelectorAll(".dropdown-content");
  dropdowns.forEach(d => d.classList.remove("show"));
});

// ============================================================
// MÓDULO DE MANUTENÇÃO E ALARMES (DATA / HORAS)
// ============================================================

function toggleCamposAlarme() {
  const chk = document.getElementById("chkAtivarAlarme");
  const container = document.getElementById("containerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

function abrirModalManutencao() {
  const modal = document.getElementById("modalManutencao");
  if (!modal) return;
  
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
  
  document.getElementById("dataManutencao").value = dataHojeInput();

  const chk = document.getElementById("chkAtivarAlarme");
  if (chk) chk.checked = false;
  toggleCamposAlarme();
}

function fecharModalManutencao() {
  const modal = document.getElementById("modalManutencao");
  if (modal) {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
  }

  document.getElementById("selectVeiculoManutencao").value = "";
  document.getElementById("nomeVeiculoManutencao").value = "";
  document.getElementById("tipoManutencao").value = "";
  document.getElementById("kmManutencao").value = "";
  document.getElementById("proximaTrocaKm").value = "";
  
  const chk = document.getElementById("chkAtivarAlarme");
  if (chk) chk.checked = false;
  
  document.getElementById("dataAlarme").value = "";
  document.getElementById("horasAlarme").value = "";
  toggleCamposAlarme();
}

function carregarNomeVeiculo() {
  const placa = document.getElementById("selectVeiculoManutencao").value;
  const veiculo = DB.veiculos.find(v => v.placa === placa);
  document.getElementById("nomeVeiculoManutencao").value = veiculo ? veiculo.nome : "";
}

function registrarManutencao() {
  const data = document.getElementById("dataManutencao").value;
  const placa = document.getElementById("selectVeiculoManutencao").value;
  const nome = document.getElementById("nomeVeiculoManutencao").value;
  const tipo = document.getElementById("tipoManutencao").value.trim().toUpperCase();
  const km = Number(document.getElementById("kmManutencao").value) || "";
  const proximaTroca = Number(document.getElementById("proximaTrocaKm").value) || "";
  
  const temAlarme = document.getElementById("chkAtivarAlarme")?.checked || false;
  const dataAlarmeVal = document.getElementById("dataAlarme").value;
  const horasAlarmeVal = Number(document.getElementById("horasAlarme").value);

  if (!data || !placa || !tipo) {
    alert("PREENCHA DATA, VEÍCULO E TIPO DE SERVIÇO.");
    return;
  }

  // Lógica de formatação da mensagem do alarme
  let textoAlarme = "";
  
  if (temAlarme) {
    let partesAlarme = [];

    if (dataAlarmeVal) {
      partesAlarme.push(`DATA: ${formatarData(dataAlarmeVal)}`);
    }

    if (horasAlarmeVal > 0) {
      const agora = new Date();
      agora.setHours(agora.getHours() + horasAlarmeVal);
      
      const horaCalc = String(agora.getHours()).padStart(2, '0');
      const minCalc = String(agora.getMinutes()).padStart(2, '0');
      
      partesAlarme.push(`APÓS ${horasAlarmeVal}H (${horaCalc}:${minCalc})`);
    }

    textoAlarme = partesAlarme.join(" | ") || "ALARME ATIVADO";
  }

  // Estrutura enviada e salva: [data, placa, nome, tipo, km, proximaTroca, dataAlarme, detalheAlarme]
  const registro = [data, placa, nome, tipo, km, proximaTroca, dataAlarmeVal, textoAlarme];

  DB.manutencao.push(registro);
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("registrarManutencao", registro);
  fecharModalManutencao();
  alert("MANUTENÇÃO REGISTRADA COM SUCESSO!");
}

function excluirManutencao(index) {
  if (confirm("DESEJA REALMENTE EXCLUIR ESTE REGISTRO?")) {
    DB.manutencao.splice(index, 1);
    salvarDB();
    carregarDados();
  }
}

function preencherTabelaManutencao(dados) {
  const thead = document.getElementById("cabecalhoTabela");
  const tbody = document.querySelector("#tabelaHistorico tbody");

  if (thead) {
    thead.innerHTML = `
      <th>DATA</th>
      <th>PLACA</th>
      <th>VEÍCULO</th>
      <th>TIPO SERVIÇO</th>
      <th>KM ATUAL</th>
      <th>PRÓX. TROCA</th>
      <th>ALARME</th>
      <th>AÇÕES</th>
    `;
  }

  tbody.innerHTML = "";

  if (!dados || !dados.length) {
    tbody.innerHTML = '<tr><td colspan="8">NENHUMA MANUTENÇÃO REGISTRADA</td></tr>';
    return;
  }

  dados.forEach((r, index) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = formatarData(r[0]);
    tr.insertCell().textContent = r[1] || "-";
    tr.insertCell().textContent = r[2] || "-";
    tr.insertCell().textContent = r[3] || "-";
    tr.insertCell().textContent = r[4] ? `${r[4]} KM` : "-";
    tr.insertCell().textContent = r[5] ? `${r[5]} KM` : "-";
    
    // Formatação da coluna de Alarme na tabela
    const infoAlarme = r[7] ? `⏰ ${r[7]}` : (r[6] ? `⏰ ${formatarData(r[6])}` : "-");
    tr.insertCell().textContent = infoAlarme;

    const td = tr.insertCell();
    td.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${index}')">MAIS</button>
        <div class="dropdown-content" id="dropdownmanut_${index}">
          <button type="button" onclick="excluirManutencao(${index})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

// Integracao assincrona para nao travar a tela
function enviarParaGoogleSheets(acao, payload) {
  if (!WEB_APP_URL || WEB_APP_URL.includes("SUA_URL_DO_GOOGLE_APPS_SCRIPT")) {
    return;
  }

  fetch(WEB_APP_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ acao: acao, dados: payload })
  }).catch(err => console.error("Erro ao integrar com Google Sheets:", err));
}
