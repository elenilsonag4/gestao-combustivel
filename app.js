// ============================================================
// AG4 FROTA - APP.JS
// ============================================================

// Variáveis Globais de Estado
let DB = {
  veiculos: [],
  abastecimento: [],
  manutencao: []
};
let listaVeiculosGlobal = [];

const URL_APPS_SCRIPT = "SEU_URL_DO_APPS_SCRIPT_AQUI"; // Cole a URL do Web App implantado

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
  vincularEventosExclusividadeAlarme();
});

function horaAgoraInput() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, '0');
  const m = String(agora.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ------------------------------------------------------------
// CORREÇÃO: REGRA MUTUAMENTE EXCLUSIVA DE ALARME (DATA OU HORAS)
// ------------------------------------------------------------
function vincularEventosExclusividadeAlarme() {
  configurarAlarmeMutuo('dataManutencao', 'horaManutencao', 'dataAlarme', 'horasAlarme');
}

function configurarAlarmeMutuo(idDataRef, idHoraRef, idDataAlarme, idHorasAlarme) {
  const campoDataRef = document.getElementById(idDataRef);
  const campoHoraRef = document.getElementById(idHoraRef);
  const campoDataAlarme = document.getElementById(idDataAlarme);
  const campoHorasAlarme = document.getElementById(idHorasAlarme);

  if (!campoDataAlarme || !campoHorasAlarme) return;

  // Quando digita Horas: limpa Data do Alarme e calcula a data limite se houver data/hora base
  campoHorasAlarme.addEventListener("input", () => {
    const horas = Number(campoHorasAlarme.value);
    if (horas > 0) {
      campoDataAlarme.value = "";
      const dataBase = campoDataRef?.value;
      const horaBase = campoHoraRef?.value || "00:00";

      if (dataBase) {
        const [ano, mes, dia] = dataBase.split('-').map(Number);
        const [h, m] = horaBase.split(':').map(Number);
        const dt = new Date(ano, mes - 1, dia, h, m);
        dt.setHours(dt.getHours() + horas);

        const a = dt.getFullYear();
        const mesFmt = String(dt.getMonth() + 1).padStart(2, '0');
        const diaFmt = String(dt.getDate()).padStart(2, '0');
        campoDataAlarme.value = `${a}-${mesFmt}-${diaFmt}`;
      }
    }
  });

  // Quando escolhe Data do Alarme: limpa o campo de Horas
  campoDataAlarme.addEventListener("input", () => {
    if (campoDataAlarme.value) {
      campoHorasAlarme.value = "";
    }
  });
}

function toggleCamposAlarme() {
  const chk = document.getElementById("chkAtivarAlarme");
  const container = document.getElementById("containerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

// ------------------------------------------------------------
// COMUNICAÇÃO COM O GOOGLE APPS SCRIPT
// ------------------------------------------------------------
async function enviarParaGoogleSheets(acao, dados) {
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: acao, dados: dados })
    });
    return await response.json();
  } catch (erro) {
    console.error("Erro na comunicação com o Google Sheets:", erro);
  }
}

async function carregarDados() {
  try {
    const res = await fetch(`${URL_APPS_SCRIPT}?acao=obterDados`);
    const json = await res.json();
    if (json.ok && json.DB) {
      DB = json.DB;
      listaVeiculosGlobal = DB.veiculos || [];
      renderizarTabelas();
      atualizarSelectsVeiculos();
    }
  } catch (e) {
    console.error("Erro ao carregar dados:", e);
  }
}

function renderizarTabelas() {
  preencherTabelaManutencao();
}

function atualizarSelectsVeiculos() {
  const select = document.getElementById("selectVeiculoManutencao");
  if (!select) return;
  select.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';

  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });
}

// ------------------------------------------------------------
// MANUTENÇÃO: REGISTRO
// ------------------------------------------------------------
function salvarManutencao() {
  const data = document.getElementById("dataManutencao").value;
  const hora = document.getElementById("horaManutencao").value || horaAgoraInput();
  const placa = document.getElementById("selectVeiculoManutencao").value;
  const tipo = document.getElementById("tipoManutencao").value.trim().toUpperCase();

  const veiculo = DB.veiculos.find(v => v.placa === placa);
  const nome = veiculo?.nome || "";

  const temAlarme = document.getElementById("chkAtivarAlarme")?.checked || false;
  const dataAlarme = temAlarme ? document.getElementById("dataAlarme").value : "";
  const horasAlarme = temAlarme ? (document.getElementById("horasAlarme")?.value || "") : "";
  const obsAlarme = temAlarme ? document.getElementById("obsAlarme").value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA OS CAMPOS OBRIGATÓRIOS: DATA, VEÍCULO E TIPO.");
    return;
  }

  const novoRegistro = [data, placa, nome, tipo, hora, horasAlarme, dataAlarme, obsAlarme];

  DB.manutencao.push(novoRegistro);
  preencherTabelaManutencao();

  enviarParaGoogleSheets("registrarManutencao", novoRegistro);
  alert("MANUTENÇÃO REGISTRADA COM SUCESSO!");
}

function preencherTabelaManutencao() {
  const tbody = document.getElementById("tbodyManutencao");
  if (!tbody) return;
  tbody.innerHTML = "";

  DB.manutencao.forEach((reg, index) => {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = reg[0]; // Data
    tr.insertCell().textContent = reg[1]; // Placa
    tr.insertCell().textContent = reg[2]; // Nome
    tr.insertCell().textContent = reg[3]; // Tipo
    tr.insertCell().textContent = reg[4] || "-"; // Hora
    tr.insertCell().textContent = reg[5] ? `${reg[5]}h` : "-"; // Horas Alarme
    tr.insertCell().textContent = reg[6] || "-"; // Data Alarme
    tr.insertCell().textContent = reg[7] || "-"; // Obs Alarme

    const tdAcoes = tr.insertCell();
    tdAcoes.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${index}')">MAIS</button>
        <div class="dropdown-content" id="dropdown_manut_${index}">
          <button type="button" onclick="abrirModalEditarManutencao(${index})">EDITAR</button>
          <button type="button" onclick="excluirManutencao(${index})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

// ------------------------------------------------------------
// MANUTENÇÃO: EDIÇÃO E MODAL
// ------------------------------------------------------------
function abrirModalEditarManutencao(index) {
  const registro = DB.manutencao[index];
  if (!registro) return;

  if (!document.getElementById("modalEditarManutencao")) {
    criarModalEditarManutencao();
  }

  // Configura exclusividade mutua nos campos de edição
  configurarAlarmeMutuo('editDataManutencao', 'editHoraManutencao', 'editDataAlarme', 'editHorasAlarme');

  const select = document.getElementById("editSelectVeiculoManutencao");
  select.innerHTML = "";

  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });

  document.getElementById("editManutIndex").value = index;
  document.getElementById("editDataManutencao").value = registro[0];
  document.getElementById("editHoraManutencao").value = registro[4] || horaAgoraInput();
  document.getElementById("editSelectVeiculoManutencao").value = registro[1];
  document.getElementById("editTipoManutencao").value = registro[3] || "";

  const temAlarme = Boolean(registro[5] || registro[6] || registro[7]);
  const chk = document.getElementById("editChkAtivarAlarme");
  if (chk) chk.checked = temAlarme;

  document.getElementById("editHorasAlarme").value = registro[5] || "";
  document.getElementById("editDataAlarme").value = registro[6] || "";
  document.getElementById("editObsAlarme").value = registro[7] || "";

  toggleCamposAlarmeEdicao();
  document.getElementById("modalEditarManutencao").style.display = "block";
}

function toggleCamposAlarmeEdicao() {
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
  
  const veiculo = DB.veiculos.find(v => v.placa === placa);
  const nome = veiculo?.nome || "";

  const tipo = document.getElementById("editTipoManutencao").value.trim().toUpperCase();

  const temAlarme = document.getElementById("editChkAtivarAlarme")?.checked || false;
  const dataAlarme = temAlarme ? document.getElementById("editDataAlarme").value : "";
  const horasAlarme = temAlarme ? (document.getElementById("editHorasAlarme")?.value || "") : "";
  const obsAlarme = temAlarme ? document.getElementById("editObsAlarme").value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA OS CAMPOS OBRIGATÓRIOS: DATA, VEÍCULO E TIPO.");
    return;
  }

  const novoRegistro = [data, placa, nome, tipo, hora, horasAlarme, dataAlarme, obsAlarme];

  DB.manutencao[index] = novoRegistro;
  preencherTabelaManutencao();

  enviarParaGoogleSheets("editarManutencao", { antigo: antigo, novo: novoRegistro });
  fecharModalEditarManutencao();
  alert("MANUTENÇÃO ATUALIZADA COM SUCESSO!");
}

function excluirManutencao(index) {
  const item = DB.manutencao[index];
  if (!item) return;

  if (confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTE REGISTRO?")) {
    DB.manutencao.splice(index, 1);
    preencherTabelaManutencao();
    enviarParaGoogleSheets("excluirManutencao", { item: item });
  }
}

function toggleDropdown(event, id) {
  event.stopPropagation();
  const target = document.getElementById(`dropdown_${id}`);
  document.querySelectorAll(".dropdown-content").forEach(el => {
    if (el !== target) el.style.display = "none";
  });
  if (target) {
    target.style.display = target.style.display === "block" ? "none" : "block";
  }
}

window.onclick = function() {
  document.querySelectorAll(".dropdown-content").forEach(el => el.style.display = "none");
};

function criarModalEditarManutencao() {
  const html = `
    <div id="modalEditarManutencao" class="modal">
      <div class="modal-content">
        <button type="button" class="close" onclick="fecharModalEditarManutencao()" aria-label="Fechar">&times;</button>
        <h2>EDITAR MANUTENÇÃO</h2>
        <input type="hidden" id="editManutIndex">
        <div class="grid-2">
          <div class="form-group">
            <label for="editDataManutencao">DATA</label>
            <input type="date" id="editDataManutencao">
          </div>
          <div class="form-group">
            <label for="editHoraManutencao">HORÁRIO</label>
            <input type="time" id="editHoraManutencao">
          </div>
        </div>
        <div class="form-group">
          <label for="editSelectVeiculoManutencao">VEÍCULO</label>
          <select id="editSelectVeiculoManutencao"></select>
        </div>
        <div class="form-group">
          <label for="editTipoManutencao">TIPO</label>
          <input type="text" id="editTipoManutencao" placeholder="EX: TROCA DE ÓLEO">
        </div>
        <div class="form-group" style="margin-top: 15px;">
          <label class="checkbox-alarme-label">
            <input type="checkbox" id="editChkAtivarAlarme" onchange="toggleCamposAlarmeEdicao()">
            ⏰ DEFINIR ALARME / LEMBRETE
          </label>
        </div>
        <div id="editContainerAlarme" style="display: none; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px dashed #ccc; margin-bottom: 15px;">
          <div class="grid-2">
            <div class="form-group">
              <label for="editDataAlarme">DATA DO ALARME</label>
              <input type="date" id="editDataAlarme">
            </div>
            <div class="form-group">
              <label for="editHorasAlarme">DURAÇÃO (EM HORAS)</label>
              <input type="number" id="editHorasAlarme" min="1" placeholder="EX: 24, 48">
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="editObsAlarme">OBSERVAÇÃO / LEMBRETE</label>
            <input type="text" id="editObsAlarme">
          </div>
        </div>
        <div class="btn-group">
          <button type="button" class="btn btn-primary" onclick="salvarEdicaoManutencao()">SALVAR</button>
          <button type="button" class="btn btn-secondary" onclick="fecharModalEditarManutencao()">CANCELAR</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}
