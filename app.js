// ============================================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// ============================================================
const GOOGLE_SCRIPT_URL = "SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI"; // Cole a URL do Apps Script aqui

let DB = {
  veiculos: [],
  registros: [],
  manutencao: []
};

let listaVeiculosGlobal = [];

let colunaOrdenacao = {
  veiculos: { indice: 0, asc: true },
  uso: { indice: 0, asc: false },
  manutencao: { indice: 0, asc: false }
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  definirDataHoraPadrao();
  configurarEventosDOM();
  setInterval(verificarAlarmes, 60000);
});

function configurarEventosDOM() {
  window.onclick = function (event) {
    if (!event.target.matches('.action-btn')) {
      const dropdowns = document.getElementsByClassName("dropdown-content");
      for (let i = 0; i < dropdowns.length; i++) {
        if (dropdowns[i].classList.contains('show')) {
          dropdowns[i].classList.remove('show');
        }
      }
    }
  };

  const chkAlarme = document.getElementById("chkAtivarAlarme");
  if (chkAlarme) {
    chkAlarme.addEventListener("change", toggleCamposAlarme);
  }
}

function definirDataHoraPadrao() {
  const hoje = new Date().toISOString().split("T")[0];
  const agora = horaAgoraInput();

  const elData = document.getElementById("dataManutencao");
  const elHora = document.getElementById("horaManutencao");

  if (elData) elData.value = hoje;
  if (elHora) elHora.value = agora;
}

function horaAgoraInput() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toggleCamposAlarme() {
  const chk = document.getElementById("chkAtivarAlarme");
  const container = document.getElementById("containerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

// ============================================================
// ARMAZENAMENTO E SINCRONIZAÇÃO
// ============================================================
function carregarDados() {
  const local = localStorage.getItem("sistema_frota_db");
  if (local) {
    try {
      DB = JSON.parse(local);
    } catch (e) {
      console.error("Erro ao carregar dados locais", e);
    }
  }
  atualizarListas();
  verificarAlarmes();
}

function salvarDB() {
  localStorage.setItem("sistema_frota_db", JSON.stringify(DB));
}

function enviarParaGoogleSheets(acao, dados) {
  if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.includes("SUA_URL_DO_GOOGLE_APPS_SCRIPT_AQUI")) {
    console.warn("URL do Google Apps Script não configurada.");
    return;
  }

  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao, dados })
  }).catch(err => console.error("Erro na comunicação com o Google Sheets:", err));
}

// ============================================================
// ATUALIZAÇÃO DA INTERFACE (MANTENDO 9 COLUNAS ORIGINAIS)
// ============================================================
function atualizarListas() {
  listaVeiculosGlobal = DB.veiculos.map(v => ({ nome: v[0], placa: v[1] }));

  preencherSelectsVeiculo();
  preencherTabelaVeiculos(DB.veiculos);
  preencherTabelaUso(DB.registros);
  preencherTabelaManutencao(DB.manutencao);
}

function preencherSelectsVeiculo() {
  const selects = ["selectVeiculoUso", "selectVeiculoManutencao"];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const valAntigo = el.value;
    el.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';

    const ordenados = [...listaVeiculosGlobal].sort((a, b) =>
      (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
    );

    ordenados.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v.placa;
      opt.textContent = `${v.nome} - ${v.placa}`;
      el.appendChild(opt);
    });

    el.value = valAntigo;
  });
}

function preencherTabelaVeiculos(dados) {
  const tbody = document.querySelector("#tabelaVeiculos tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="3">NENHUM VEÍCULO CADASTRADO</td></tr>';
    return;
  }

  dados.forEach((r, idx) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = r[0];
    tr.insertCell().textContent = r[1];

    const tdAcoes = tr.insertCell();
    tdAcoes.innerHTML = `<button type="button" class="btn btn-danger btn-sm" onclick="excluirVeiculo(${idx})">EXCLUIR</button>`;
  });
}

function preencherTabelaUso(dados) {
  const tbody = document.querySelector("#tabelaUso tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="7">NENHUM REGISTRO DE USO</td></tr>';
    return;
  }

  dados.forEach((r, idx) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = formatarData(r[0]);
    tr.insertCell().textContent = r[1];
    tr.insertCell().textContent = r[2];
    tr.insertCell().textContent = r[3];
    tr.insertCell().textContent = r[4] || "-";
    tr.insertCell().textContent = r[5] || "-";

    const tdAcoes = tr.insertCell();
    tdAcoes.innerHTML = `<button type="button" class="btn btn-danger btn-sm" onclick="excluirRegistroUso(${idx})">EXCLUIR</button>`;
  });
}

function preencherTabelaManutencao(dados) {
  const thead = document.getElementById("cabecalhoTabela");
  const tbody = document.querySelector("#tabelaHistorico tbody");
  if (!tbody) return;

  const c = colunaOrdenacao.manutencao;

  // Monta o cabeçalho original exatamente com 9 Colunas
  if (thead) {
    thead.innerHTML = `
      <th onclick="ordenarTabela(0)" class="th-sortable">DATA${obterIndicadorOrdem('manutencao', 0)}</th>
      <th onclick="ordenarTabela(1)" class="th-sortable">PLACA${obterIndicadorOrdem('manutencao', 1)}</th>
      <th onclick="ordenarTabela(2)" class="th-sortable">VEÍCULO${obterIndicadorOrdem('manutencao', 2)}</th>
      <th onclick="ordenarTabela(3)" class="th-sortable">TIPO${obterIndicadorOrdem('manutencao', 3)}</th>
      <th onclick="ordenarTabela(4)" class="th-sortable">HORA${obterIndicadorOrdem('manutencao', 4)}</th>
      <th onclick="ordenarTabela(5)" class="th-sortable">ALARME (H)${obterIndicadorOrdem('manutencao', 5)}</th>
      <th onclick="ordenarTabela(6)" class="th-sortable">DATA ALARME${obterIndicadorOrdem('manutencao', 6)}</th>
      <th onclick="ordenarTabela(7)" class="th-sortable">OBS. ALARME${obterIndicadorOrdem('manutencao', 7)}</th>
      <th>AÇÕES</th>
    `;
  }

  tbody.innerHTML = "";

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9">NENHUMA MANUTENÇÃO REGISTRADA</td></tr>';
    return;
  }

  let dadosOrdenados = dados.map((item, indexOriginal) => ({ item, indexOriginal }));

  dadosOrdenados.sort((a, b) => {
    let valA = a.item[c.indice];
    let valB = b.item[c.indice];

    if (c.indice === 5) {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();
    }

    if (valA < valB) return c.asc ? -1 : 1;
    if (valA > valB) return c.asc ? 1 : -1;
    return 0;
  });

  dadosOrdenados.forEach(({ item: r, indexOriginal }) => {
    const tr = tbody.insertRow();

    tr.insertCell().textContent = formatarData(r[0]); // 1. DATA
    tr.insertCell().textContent = r[1] || "-";             // 2. PLACA
    tr.insertCell().textContent = r[2] || "-";             // 3. VEÍCULO
    tr.insertCell().textContent = r[3] || "-";             // 4. TIPO
    tr.insertCell().textContent = r[4] || "-";             // 5. HORA
    tr.insertCell().textContent = r[5] ? `${r[5]} H` : "-"; // 6. ALARME (H)
    tr.insertCell().textContent = r[6] ? formatarData(r[6]) : "-"; // 7. DATA ALARME
    tr.insertCell().textContent = r[7] || "-";             // 8. OBS. ALARME

    // 9. AÇÕES (EDITAR + EXCLUIR)
    const tdAcoes = tr.insertCell();
    tdAcoes.innerHTML = `
      <div class="dropdown" style="position:relative; display:inline-block;">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${indexOriginal}')">MAIS</button>
        <div class="dropdown-content" id="dropdownmanut_${indexOriginal}">
          <button type="button" onclick="abrirModalEditarManutencao(${indexOriginal})">EDITAR</button>
          <button type="button" onclick="excluirManutencao(${indexOriginal})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

// ============================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================
function toggleDropdown(event, id) {
  event.stopPropagation();
  const targetId = `dropdown${id}`;
  const dropdowns = document.getElementsByClassName("dropdown-content");

  for (let i = 0; i < dropdowns.length; i++) {
    if (dropdowns[i].id !== targetId) {
      dropdowns[i].classList.remove('show');
    }
  }

  const target = document.getElementById(targetId);
  if (target) target.classList.toggle("show");
}

function ordenarTabela(indiceColuna) {
  if (colunaOrdenacao.manutencao.indice === indiceColuna) {
    colunaOrdenacao.manutencao.asc = !colunaOrdenacao.manutencao.asc;
  } else {
    colunaOrdenacao.manutencao.indice = indiceColuna;
    colunaOrdenacao.manutencao.asc = true;
  }
  preencherTabelaManutencao(DB.manutencao);
}

function obterIndicadorOrdem(tabela, indice) {
  if (colunaOrdenacao[tabela].indice !== indice) return "";
  return colunaOrdenacao[tabela].asc ? " ▲" : " ▼";
}

function formatarData(dataStr) {
  if (!dataStr) return "-";
  const partes = dataStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

function confirmarSenha() {
  const senha = prompt("DIGITE A SENHA DE CONFIRMAÇÃO:");
  if (senha === "1234") return true;
  alert("SENHA INCORRETA!");
  return false;
}

// ============================================================
// CADASTRO E EXCLUSÃO DE MANUTENÇÃO
// ============================================================
function salvarVeiculo() {
  const nome = document.getElementById("nomeVeiculo")?.value.trim().toUpperCase();
  const placa = document.getElementById("placaVeiculo")?.value.trim().toUpperCase();

  if (!nome || !placa) {
    alert("PREENCHA NOME E PLACA DO VEÍCULO.");
    return;
  }

  if (DB.veiculos.some(v => v[1] === placa)) {
    alert("JÁ EXISTE UM VEÍCULO COM ESTA PLACA.");
    return;
  }

  const novo = [nome, placa];
  DB.veiculos.push(novo);
  salvarDB();
  atualizarListas();
  enviarParaGoogleSheets("salvarVeiculo", novo);

  document.getElementById("nomeVeiculo").value = "";
  document.getElementById("placaVeiculo").value = "";
  alert("VEÍCULO CADASTRADO COM SUCESSO!");
}

function excluirVeiculo(index) {
  if (!confirmarSenha()) return;
  const item = DB.veiculos[index];
  DB.veiculos.splice(index, 1);
  salvarDB();
  atualizarListas();
  enviarParaGoogleSheets("excluirVeiculo", { item });
}

function registrarManutencao() {
  const data = document.getElementById("dataManutencao")?.value;
  const hora = document.getElementById("horaManutencao")?.value || horaAgoraInput();
  const placa = document.getElementById("selectVeiculoManutencao")?.value;
  const veiculo = DB.veiculos.find(v => v[1] === placa);
  const nome = veiculo ? veiculo[0] : "";
  const tipo = document.getElementById("tipoManutencao")?.value.trim().toUpperCase();

  const temAlarme = document.getElementById("chkAtivarAlarme")?.checked || false;
  const horasAlarme = temAlarme ? (Number(document.getElementById("horasAlarme")?.value) || "") : "";
  const dataAlarme = temAlarme ? document.getElementById("dataAlarme")?.value : "";
  const obsAlarme = temAlarme ? document.getElementById("obsAlarme")?.value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA DATA, VEÍCULO E TIPO DE SERVIÇO.");
    return;
  }

  const registro = [data, placa, nome, tipo, hora, horasAlarme, dataAlarme, obsAlarme];
  DB.manutencao.push(registro);
  salvarDB();
  atualizarListas();
  enviarParaGoogleSheets("registrarManutencao", registro);

  document.getElementById("tipoManutencao").value = "";
  if (document.getElementById("chkAtivarAlarme")) {
    document.getElementById("chkAtivarAlarme").checked = false;
    toggleCamposAlarme();
  }
  definirDataHoraPadrao();
  alert("MANUTENÇÃO REGISTRADA COM SUCESSO!");
}

function excluirManutencao(index) {
  if (!confirmarSenha()) return;
  const item = DB.manutencao[index];
  DB.manutencao.splice(index, 1);
  salvarDB();
  atualizarListas();
  enviarParaGoogleSheets("excluirManutencao", { item });
}

// ============================================================
// EDIÇÃO DE MANUTENÇÃO (MODAL)
// ============================================================
function abrirModalEditarManutencao(index) {
  const registro = DB.manutencao[index];
  if (!registro) return;

  if (!document.getElementById("modalEditarManutencao")) {
    criarModalEditarManutencao();
  }

  const select = document.getElementById("editSelectVeiculoManutencao");
  select.innerHTML = "";

  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) =>
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });

  document.getElementById("editManutIndex").value = index;
  document.getElementById("editDataManutencao").value = registro[0] || "";
  document.getElementById("editHoraManutencao").value = registro[4] || "";
  document.getElementById("editSelectVeiculoManutencao").value = registro[1] || "";
  document.getElementById("editTipoManutencao").value = registro[3] || "";

  const temAlarme = Boolean(registro[5] || registro[6] || registro[7]);
  const chk = document.getElementById("editChkAtivarAlarme");
  chk.checked = temAlarme;

  document.getElementById("editHorasAlarme").value = registro[5] || "";
  document.getElementById("editDataAlarme").value = registro[6] || "";
  document.getElementById("editObsAlarme").value = registro[7] || "";

  toggleCamposAlarmeEditar();
  document.getElementById("modalEditarManutencao").style.display = "block";
}

function toggleCamposAlarmeEditar() {
  const chk = document.getElementById("editChkAtivarAlarme");
  const container = document.getElementById("editContainerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

function fecharModalEditarManutencao() {
  const modal = document.getElementById("modalEditarManutencao");
  if (modal) modal.style.display = "none";
}

function salvarEdicaoManutencao() {
  const index = Number(document.getElementById("editManutIndex").value);
  const antigo = DB.manutencao[index];
  if (!antigo) return;

  const data = document.getElementById("editDataManutencao").value;
  const hora = document.getElementById("editHoraManutencao").value || horaAgoraInput();
  const placa = document.getElementById("editSelectVeiculoManutencao").value;
  const veiculo = DB.veiculos.find(v => v[1] === placa);
  const nome = veiculo ? veiculo[0] : "";
  const tipo = document.getElementById("editTipoManutencao").value.trim().toUpperCase();

  const temAlarme = document.getElementById("editChkAtivarAlarme")?.checked || false;
  const horasAlarme = temAlarme ? (Number(document.getElementById("editHorasAlarme")?.value) || "") : "";
  const dataAlarme = temAlarme ? document.getElementById("editDataAlarme").value : "";
  const obsAlarme = temAlarme ? document.getElementById("editObsAlarme").value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA DATA, VEÍCULO E TIPO.");
    return;
  }

  if (!confirmarSenha()) return;

  const novoRegistro = [data, placa, nome, tipo, hora, horasAlarme, dataAlarme, obsAlarme];

  DB.manutencao[index] = novoRegistro;
  salvarDB();
  atualizarListas();

  enviarParaGoogleSheets("editarManutencao", { antigo, novo: novoRegistro });
  fecharModalEditarManutencao();
  alert("MANUTENÇÃO ATUALIZADA COM SUCESSO!");
}

function criarModalEditarManutencao() {
  const html = `
    <div id="modalEditarManutencao" class="modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.5);">
      <div class="modal-content" style="background:#fff; margin:5% auto; padding:20px; border-radius:8px; width:90%; max-width:500px;">
        <button type="button" class="close" onclick="fecharModalEditarManutencao()" style="float:right; border:none; background:none; font-size:20px;">&times;</button>
        <h2>EDITAR MANUTENÇÃO</h2>
        <input type="hidden" id="editManutIndex">
        <div style="display:flex; gap:10px; margin-top:10px;">
          <div style="flex:1;">
            <label>DATA</label>
            <input type="date" id="editDataManutencao" style="width:100%;">
          </div>
          <div style="flex:1;">
            <label>HORÁRIO</label>
            <input type="time" id="editHoraManutencao" style="width:100%;">
          </div>
        </div>
        <div style="margin-top:10px;">
          <label>VEÍCULO</label>
          <select id="editSelectVeiculoManutencao" style="width:100%;"></select>
        </div>
        <div style="margin-top:10px;">
          <label>TIPO DE SERVIÇO</label>
          <input type="text" id="editTipoManutencao" style="width:100%;">
        </div>
        <div style="margin-top:15px;">
          <label>
            <input type="checkbox" id="editChkAtivarAlarme" onchange="toggleCamposAlarmeEditar()">
            ⏰ DEFINIR ALARME / LEMBRETE
          </label>
        </div>
        <div id="editContainerAlarme" style="display:none; background:#f8f9fa; padding:12px; border-radius:6px; border:1px dashed #ccc; margin-top:10px;">
          <div style="display:flex; gap:10px;">
            <div style="flex:1;">
              <label>DATA DO ALARME</label>
              <input type="date" id="editDataAlarme" style="width:100%;">
            </div>
            <div style="flex:1;">
              <label>DURAÇÃO (HORAS)</label>
              <input type="number" id="editHorasAlarme" min="1" style="width:100%;">
            </div>
          </div>
          <div style="margin-top:10px;">
            <label>OBSERVAÇÃO / LEMBRETE</label>
            <input type="text" id="editObsAlarme" style="width:100%;">
          </div>
        </div>
        <div style="margin-top:20px; display:flex; gap:10px; justify-content:flex-end;">
          <button type="button" class="btn btn-primary" onclick="salvarEdicaoManutencao()">SALVAR</button>
          <button type="button" class="btn btn-secondary" onclick="fecharModalEditarManutencao()">CANCELAR</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

// ============================================================
// VERIFICAÇÃO DE ALARMES
// ============================================================
function verificarAlarmes() {
  if (!DB.manutencao.length) return;
  const hoje = new Date().toISOString().split("T")[0];

  DB.manutencao.forEach(item => {
    const dataAlarme = item[6];
    const obs = item[7] || item[3];
    const placa = item[1];

    if (dataAlarme && dataAlarme <= hoje) {
      console.log(`⏰ ALARME: Veículo ${placa} possui manutenção pendente: ${obs}`);
    }
  });
}
