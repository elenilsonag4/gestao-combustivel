/* ============================================================
   SISTEMA DE GESTÃO DE FROTA - APP.JS
   ============================================================ */

// Estado da Aplicação e Banco de Dados Local (In-Memory)
const DB = {
  abastecimento: [],
  manutencao: [],
  veiculos: [],
  motoristas: [],
  fornecedores: [],
  postos: [],
  tiposManutencao: []
};

// Controle de Ordenação das Tabelas
const colunaOrdenacao = {
  abastecimento: { indice: 0, asc: false },
  manutencao: { indice: 0, asc: false }
};

// Índices para edição em Modal
let idEdicaoAbastecimento = null;
let idEdicaoManutencao = null;

/* ============================================================
   UTILITÁRIOS E HELPERS
   ============================================================ */

function limparNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  const num = String(valor).replace(/[^\d.,-]/g, "").replace(",", ".");
  return parseFloat(num) || 0;
}

function formatarData(dataISO) {
  if (!dataISO) return "-";
  const partes = dataISO.split("T")[0].split("-");
  if (partes.length !== 3) return dataISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterIndicadorOrdem(tabela, indice) {
  const c = colunaOrdenacao[tabela];
  if (c.indice !== indice) return "";
  return c.asc ? " ▲" : " ▼";
}

/**
 * Retorna o maior KM registrado para uma determinada placa
 * (Busca tanto no histórico de Abastecimento quanto de Manutenção)
 */
function obterKmAtualDoVeiculo(placa) {
  if (!placa) return 0;

  // Busca KMs dos abastecimentos da mesma placa
  const kmsAbast = DB.abastecimento
    .filter(r => r[1] === placa)
    .map(r => limparNumero(r[6]));

  // Busca KMs das manutenções da mesma placa
  const kmsManut = DB.manutencao
    .filter(r => r[2] === placa)
    .map(r => limparNumero(r[5]));

  const todosKms = [...kmsAbast, ...kmsManut];
  if (todosKms.length === 0) return 0;

  return Math.max(...todosKms);
}

/* ============================================================
   INICIALIZAÇÃO E EVENTOS
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  carregarDadosLocais();
  inicializarEventos();
  atualizarTudo();
});

function inicializarEventos() {
  // Troca de Abas
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      e.target.classList.add("active");
      const targetId = e.target.getAttribute("data-tab");
      document.getElementById(targetId).classList.add("active");
    });
  });

  // Eventos de Submissão de Formulários
  const formAbast = document.getElementById("formAbastecimento");
  if (formAbast) formAbast.addEventListener("submit", salvarAbastecimento);

  const formManut = document.getElementById("formManutencao");
  if (formManut) formManut.addEventListener("submit", salvarManutencao);
}

function salvarDadosLocais() {
  localStorage.setItem("GESTAU_FROTA_DB", JSON.stringify(DB));
}

function carregarDadosLocais() {
  const dadosSalvos = localStorage.getItem("GESTAU_FROTA_DB");
  if (dadosSalvos) {
    try {
      const parsed = JSON.parse(dadosSalvos);
      Object.assign(DB, parsed);
    } catch (e) {
      console.error("Erro ao carregar dados do LocalStorage:", e);
    }
  }
}

function atualizarTudo() {
  preencherSelects();
  preencherTabelaAbastecimento(DB.abastecimento);
  preencherTabelaManutencao(DB.manutencao);
}

/* ============================================================
   SELECTS E DROPDOWNS
   ============================================================ */

function preencherSelects() {
  const popularSelect = (idSelect, lista, indiceValor, indiceTexto) => {
    const select = document.getElementById(idSelect);
    if (!select) return;
    const valorAtual = select.value;
    select.innerHTML = '<option value="">SELEÇÃO...</option>';
    lista.forEach(item => {
      const opt = document.createElement("option");
      opt.value = typeof item === "object" ? item[indiceValor] : item;
      opt.textContent = typeof item === "object" ? item[indiceTexto || indiceValor] : item;
      select.appendChild(opt);
    });
    select.value = valorAtual;
  };

  popularSelect("abastPlaca", DB.veiculos, 0, 0);
  popularSelect("abastMotorista", DB.motoristas, 0, 0);
  popularSelect("abastPosto", DB.postos, 0, 0);

  popularSelect("manutPlaca", DB.veiculos, 0, 0);
  popularSelect("manutFornecedor", DB.fornecedores, 0, 0);
  popularSelect("manutTipo", DB.tiposManutencao, 0, 0);
}

/* ============================================================
   GERENCIAMENTO DE ABASTECIMENTOS
   ============================================================ */

function salvarAbastecimento(e) {
  e.preventDefault();

  const data = document.getElementById("abastData").value;
  const placa = document.getElementById("abastPlaca").value;
  const motorista = document.getElementById("abastMotorista").value;
  const posto = document.getElementById("abastPosto").value;
  const combustivel = document.getElementById("abastCombustivel").value;
  const litros = document.getElementById("abastLitros").value;
  const km = document.getElementById("abastKm").value;
  const valorTotal = document.getElementById("abastValorTotal").value;

  if (idEdicaoAbastecimento !== null) {
    DB.abastecimento[idEdicaoAbastecimento] = [
      data, placa, motorista, posto, combustivel, litros, km, valorTotal
    ];
    idEdicaoAbastecimento = null;
  } else {
    DB.abastecimento.push([
      data, placa, motorista, posto, combustivel, litros, km, valorTotal
    ]);
  }

  salvarDadosLocais();
  document.getElementById("formAbastecimento").reset();
  atualizarTudo();
  alert("Abastecimento salvo com sucesso!");
}

function preencherTabelaAbastecimento(dados) {
  const thead = document.getElementById("cabecalhoTabelaAbast");
  const tbody = document.querySelector("#tabelaAbastecimento tbody");
  if (!tbody) return;

  const c = colunaOrdenacao.abastecimento;

  if (thead) {
    thead.innerHTML = `
      <th onclick="ordenarTabelaAbast(0)" class="th-sortable">DATA${obterIndicadorOrdem('abastecimento', 0)}</th>
      <th onclick="ordenarTabelaAbast(1)" class="th-sortable">PLACA${obterIndicadorOrdem('abastecimento', 1)}</th>
      <th onclick="ordenarTabelaAbast(2)" class="th-sortable">MOTORISTA${obterIndicadorOrdem('abastecimento', 2)}</th>
      <th onclick="ordenarTabelaAbast(3)" class="th-sortable">POSTO${obterIndicadorOrdem('abastecimento', 3)}</th>
      <th onclick="ordenarTabelaAbast(4)" class="th-sortable">COMBUSTÍVEL${obterIndicadorOrdem('abastecimento', 4)}</th>
      <th onclick="ordenarTabelaAbast(5)" class="th-sortable">LITROS${obterIndicadorOrdem('abastecimento', 5)}</th>
      <th onclick="ordenarTabelaAbast(6)" class="th-sortable">KM${obterIndicadorOrdem('abastecimento', 6)}</th>
      <th onclick="ordenarTabelaAbast(7)" class="th-sortable">VALOR TOTAL${obterIndicadorOrdem('abastecimento', 7)}</th>
      <th>AÇÕES</th>
    `;
  }

  tbody.innerHTML = "";

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9">NENHUM ABASTECIMENTO REGISTRADO</td></tr>';
    return;
  }

  let dadosOrdenados = dados.map((item, indexOriginal) => ({ item, indexOriginal }));

  dadosOrdenados.sort((a, b) => {
    let valA = a.item[c.indice];
    let valB = b.item[c.indice];

    if ([5, 6, 7].includes(c.indice)) {
      valA = limparNumero(valA);
      valB = limparNumero(valB);
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
    tr.insertCell().textContent = formatarData(r[0]);
    tr.insertCell().textContent = r[1] || "-";
    tr.insertCell().textContent = r[2] || "-";
    tr.insertCell().textContent = r[3] || "-";
    tr.insertCell().textContent = r[4] || "-";
    tr.insertCell().textContent = r[5] ? `${r[5]} L` : "-";
    tr.insertCell().textContent = r[6] ? `${r[6]} KM` : "-";
    tr.insertCell().textContent = r[7] ? `R$ ${limparNumero(r[7]).toFixed(2)}` : "-";

    const tdActions = tr.insertCell();
    tdActions.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'abast_${indexOriginal}')">MAIS</button>
        <div class="dropdown-content" id="dropdownabast_${indexOriginal}">
          <button type="button" onclick="editarAbastecimento(${indexOriginal})">EDITAR</button>
          <button type="button" onclick="excluirAbastecimento(${indexOriginal})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

function ordenarTabelaAbast(indice) {
  if (colunaOrdenacao.abastecimento.indice === indice) {
    colunaOrdenacao.abastecimento.asc = !colunaOrdenacao.abastecimento.asc;
  } else {
    colunaOrdenacao.abastecimento.indice = indice;
    colunaOrdenacao.abastecimento.asc = true;
  }
  preencherTabelaAbastecimento(DB.abastecimento);
}

function editarAbastecimento(index) {
  const item = DB.abastecimento[index];
  if (!item) return;

  idEdicaoAbastecimento = index;
  document.getElementById("abastData").value = item[0] || "";
  document.getElementById("abastPlaca").value = item[1] || "";
  document.getElementById("abastMotorista").value = item[2] || "";
  document.getElementById("abastPosto").value = item[3] || "";
  document.getElementById("abastCombustivel").value = item[4] || "";
  document.getElementById("abastLitros").value = item[5] || "";
  document.getElementById("abastKm").value = item[6] || "";
  document.getElementById("abastValorTotal").value = item[7] || "";

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirAbastecimento(index) {
  if (confirm("Tem certeza que deseja excluir este abastecimento?")) {
    DB.abastecimento.splice(index, 1);
    salvarDadosLocais();
    atualizarTudo();
  }
}

/* ============================================================
   GERENCIAMENTO DE MANUTENÇÃO & CORREÇÃO DOS ALARMES
   ============================================================ */

function salvarManutencao(e) {
  e.preventDefault();

  const data = document.getElementById("manutData").value;
  const fornecedor = document.getElementById("manutFornecedor").value;
  const placa = document.getElementById("manutPlaca").value;
  const veiculo = document.getElementById("manutVeiculo") ? document.getElementById("manutVeiculo").value : placa;
  const tipo = document.getElementById("manutTipo").value;
  const kmAtual = document.getElementById("manutKmAtual").value;
  const proximaTrocaKm = document.getElementById("manutProximaTrocaKm").value;
  const dataAlarme = document.getElementById("manutDataAlarme").value;
  const obsAlarme = document.getElementById("manutObsAlarme").value;

  const registro = [
    data, fornecedor, placa, veiculo, tipo, kmAtual, proximaTrocaKm, dataAlarme, obsAlarme
  ];

  if (idEdicaoManutencao !== null) {
    DB.manutencao[idEdicaoManutencao] = registro;
    idEdicaoManutencao = null;
  } else {
    DB.manutencao.push(registro);
  }

  salvarDadosLocais();
  document.getElementById("formManutencao").reset();
  atualizarTudo();
  alert("Manutenção salva com sucesso!");
}

function preencherTabelaManutencao(dados) {
  const thead = document.getElementById("cabecalhoTabela");
  const tbody = document.querySelector("#tabelaHistorico tbody");
  if (!tbody) return;

  const c = colunaOrdenacao.manutencao;

  if (thead) {
    thead.innerHTML = `
      <th onclick="ordenarTabela(0)" class="th-sortable">DATA${obterIndicadorOrdem('manutencao', 0)}</th>
      <th onclick="ordenarTabela(2)" class="th-sortable">PLACA${obterIndicadorOrdem('manutencao', 2)}</th>
      <th onclick="ordenarTabela(3)" class="th-sortable">VEÍCULO${obterIndicadorOrdem('manutencao', 3)}</th>
      <th onclick="ordenarTabela(4)" class="th-sortable">TIPO${obterIndicadorOrdem('manutencao', 4)}</th>
      <th onclick="ordenarTabela(5)" class="th-sortable">KM${obterIndicadorOrdem('manutencao', 5)}</th>
      <th onclick="ordenarTabela(6)" class="th-sortable">PRÓXIMA TROCA (KM)${obterIndicadorOrdem('manutencao', 6)}</th>
      <th onclick="ordenarTabela(7)" class="th-sortable">DATA ALARME${obterIndicadorOrdem('manutencao', 7)}</th>
      <th onclick="ordenarTabela(8)" class="th-sortable">OBS ALARME${obterIndicadorOrdem('manutencao', 8)}</th>
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

    if ([5, 6].includes(c.indice)) {
      valA = limparNumero(valA);
      valB = limparNumero(valB);
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

    const placa = r[2];
    const kmProximaTroca = limparNumero(r[6]);
    const kmAtualVeiculo = obterKmAtualDoVeiculo(placa);

    // LÓGICA DO ALARME: Se o KM Atual do veículo ultrapassou/atingiu o KM da Próxima Troca
    const alarmeAtivadoPorKm = kmProximaTroca > 0 && kmAtualVeiculo >= kmProximaTroca;

    tr.insertCell().textContent = formatarData(r[0]);
    tr.insertCell().textContent = r[2] || "-";
    tr.insertCell().textContent = r[3] || "-";
    tr.insertCell().textContent = r[4] || "-";
    tr.insertCell().textContent = r[5] !== "" && r[5] !== undefined ? `${r[5]} KM` : "-";

    // Célula do KM de Próxima Troca
    const tdProximaTroca = tr.insertCell();
    tdProximaTroca.textContent = r[6] !== "" && r[6] !== undefined ? `${r[6]} KM` : "-";

    // Célula DATA DO ALARME com Destaque em Vermelho
    const tdAlarme = tr.insertCell();
    tdAlarme.textContent = r[7] ? formatarData(r[7]) : "-";

    // Se o Alarme de KM for ativado, aplica as classes e tooltip
    if (alarmeAtivadoPorKm) {
      tdAlarme.classList.add("alarme-vermelho");
      tdAlarme.title = `ALERTA DE KM: O veículo atingiu/ultrapassou o limite! (KM Atual: ${kmAtualVeiculo} KM | Troca: ${kmProximaTroca} KM)`;
      tdProximaTroca.classList.add("alarme-vermelho-texto");
    }

    tr.insertCell().textContent = r[8] ? r[8] : "-";

    const tdActions = tr.insertCell();
    tdActions.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${indexOriginal}')">MAIS</button>
        <div class="dropdown-content" id="dropdownmanut_${indexOriginal}">
          <button type="button" onclick="editarManutencao(${indexOriginal})">EDITAR</button>
          <button type="button" onclick="excluirManutencao(${indexOriginal})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

function ordenarTabela(indice) {
  if (colunaOrdenacao.manutencao.indice === indice) {
    colunaOrdenacao.manutencao.asc = !colunaOrdenacao.manutencao.asc;
  } else {
    colunaOrdenacao.manutencao.indice = indice;
    colunaOrdenacao.manutencao.asc = true;
  }
  preencherTabelaManutencao(DB.manutencao);
}

function editarManutencao(index) {
  const item = DB.manutencao[index];
  if (!item) return;

  idEdicaoManutencao = index;
  document.getElementById("manutData").value = item[0] || "";
  document.getElementById("manutFornecedor").value = item[1] || "";
  document.getElementById("manutPlaca").value = item[2] || "";
  if (document.getElementById("manutVeiculo")) {
    document.getElementById("manutVeiculo").value = item[3] || "";
  }
  document.getElementById("manutTipo").value = item[4] || "";
  document.getElementById("manutKmAtual").value = item[5] || "";
  document.getElementById("manutProximaTrocaKm").value = item[6] || "";
  document.getElementById("manutDataAlarme").value = item[7] || "";
  document.getElementById("manutObsAlarme").value = item[8] || "";

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function excluirManutencao(index) {
  if (confirm("Tem certeza que deseja excluir este registro de manutenção?")) {
    DB.manutencao.splice(index, 1);
    salvarDadosLocais();
    atualizarTudo();
  }
}

/* ============================================================
   CONTROLE DE DROPDOWNS DE AÇÃO NAS TABELAS
   ============================================================ */

function toggleDropdown(event, id) {
  event.stopPropagation();
  const targetDropdown = document.getElementById(`dropdown${id}`);

  document.querySelectorAll(".dropdown-content").forEach(el => {
    if (el !== targetDropdown) {
      el.classList.remove("show");
    }
  });

  if (targetDropdown) {
    targetDropdown.classList.toggle("show");
  }
}

// Fecha dropdowns se clicar fora
window.onclick = function (event) {
  if (!event.target.matches('.action-btn')) {
    document.querySelectorAll(".dropdown-content").forEach(el => {
      el.classList.remove("show");
    });
  }
};
