// ============================================================
// AG4 FROTA - APP.JS (CORRIGIDO E ADAPTADO)
// ============================================================

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw-pr-h9sOshx1qvI7B3G7CrIvZhfq1p3KYlXedW0gZJzsc0Gm7QVK9u4LmrecmaPnAwg/exec";

const STORAGE_KEY = "ag4_frota";
const USER_KEY = "ag4_usuario_logado";
const THEME_KEY = "ag4_tema_escuro";
const SENHA_MESTRE = "frot@AG4";

let DB = carregarDB();
let listaVeiculosGlobal = [];
let abaAtiva = "abastecimento";

let colunaOrdenacao = {
  abastecimento: { indice: 0, asc: false },
  manutencao: { indice: 0, asc: false }
};

function carregarDB() {
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!salvo || typeof salvo !== "object") {
      return { veiculos: [], abastecimento: [], manutencao: [] };
    }

    return {
      veiculos: Array.isArray(salvo.veiculos) ? salvo.veiculos : [],
      abastecimento: Array.isArray(salvo.abastecimento) ? salvo.abastecimento : [],
      manutencao: Array.isArray(salvo.manutencao) ? salvo.manutencao : []
    };
  } catch (erro) {
    console.error("Erro ao carregar banco local:", erro);
    return { veiculos: [], abastecimento: [], manutencao: [] };
  }
}

function salvarDB() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}

function dataHojeInput() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function horaAgoraInput() {
  const agora = new Date();
  const horas = String(agora.getHours()).padStart(2, "0");
  const minutos = String(agora.getMinutes()).padStart(2, "0");
  return `${horas}:${minutos}`;
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ============================================================
// LÓGICA DE ALTERNÂNCIA DE TEMA (MODO ESCURO / CLARO)
// ============================================================

function toggleTheme() {
  const isDark = document.body.classList.toggle("dark-theme");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  atualizarIconeTema(isDark);
}

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem(THEME_KEY);
  const prefereEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (temaSalvo === "dark" || (!temaSalvo && prefereEscuro)) {
    document.body.classList.add("dark-theme");
    atualizarIconeTema(true);
  } else {
    document.body.classList.remove("dark-theme");
    atualizarIconeTema(false);
  }
}

function atualizarIconeTema(isDark) {
  const btn = document.getElementById("btnThemeToggle");
  if (btn) {
    btn.textContent = isDark ? "☀️" : "🌙";
  }
}

// ============================================================
// GOOGLE SHEETS & AUTENTICAÇÃO
// ============================================================

async function enviarParaGoogleSheets(acao, dados) {
  const payload = JSON.stringify({ acao, dados });
  try {
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payload
    });
    return true;
  } catch (erro) {
    console.error("[AG4] Erro de comunicação com Google Sheets:", erro);
    alert("Erro ao conectar com o servidor. Verifique sua conexão.");
    return false;
  }
}

async function sincronizarComNuvem() {
  mostrarLoading(true);
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "obterDados" })
    });

    const res = await response.json();
    if (res.ok && res.DB) {
      DB = res.DB;
      salvarDB();
      carregarDados();
    }
  } catch (erro) {
    console.error("Erro na sincronização:", erro);
  } finally {
    mostrarLoading(false);
  }
}

async function fazerLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value.trim();
  const erroEl = document.getElementById("loginErro");

  if (!email || !senha) {
    erroEl.textContent = "PREENCHA E-MAIL E SENHA.";
    erroEl.style.display = "block";
    return;
  }

  erroEl.style.display = "none";
  mostrarLoading(true);

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ acao: "fazerLogin", dados: { email, senha } })
    });

    const res = await response.json();

    if (res.ok) {
      localStorage.setItem(USER_KEY, JSON.stringify(res.usuario || { email }));
      exibirApp(res.usuario);
      sincronizarComNuvem();
    } else {
      erroEl.textContent = res.mensagem || "E-MAIL OU SENHA INCORRETOS.";
      erroEl.style.display = "block";
    }
  } catch (erro) {
    console.error("Erro no login:", erro);
    erroEl.textContent = "ERRO AO CONECTAR COM O SERVIDOR.";
    erroEl.style.display = "block";
  } finally {
    mostrarLoading(false);
  }
}

function fazerLogout() {
  if (confirm("DESEJA REALMENTE SAIR DO SISTEMA?")) {
    localStorage.removeItem(USER_KEY);
    document.getElementById("telaLogin").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
    document.getElementById("loginEmail").value = "";
    document.getElementById("loginSenha").value = "";
  }
}

function exibirApp(usuario) {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("appContainer").style.display = "block";
  if (usuario && usuario.nome) {
    document.getElementById("nomeUsuarioLogado").textContent = `USUÁRIO: ${usuario.nome.toUpperCase()}`;
  }
}

function mostrarLoading(exibir) {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = exibir ? "flex" : "none";
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  aplicarTemaSalvo();

  document.getElementById("dataAbastecimento").value = dataHojeInput();

  document.addEventListener("input", (e) => {
    if (e.target && e.target.type === "text" && e.target.id !== "loginEmail") {
      e.target.value = e.target.value.toUpperCase();
    }
  });

  const usuarioSalvo = JSON.parse(localStorage.getItem(USER_KEY));
  if (usuarioSalvo) {
    exibirApp(usuarioSalvo);
    carregarDados();
    sincronizarComNuvem();
  } else {
    document.getElementById("telaLogin").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
  }
});

function carregarDados() {
  DB.veiculos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  listaVeiculosGlobal = DB.veiculos;
  recalcularConsumoHistorico();
  preencherSelects(DB.veiculos);
  renderizarTabela();
}

// ============================================================
// SENHA MESTRE
// ============================================================

function confirmarSenha() {
  const senhaDigitada = prompt("DIGITE A SENHA DE CONFIRMAÇÃO PARA CONTINUAR:");
  if (senhaDigitada === null) return false;
  if (senhaDigitada === SENHA_MESTRE) return true;

  alert("SENHA INCORRETA! AÇÃO NÃO PERMITIDA.");
  return false;
}

// ============================================================
// VEÍCULOS
// ============================================================

function preencherSelects(veiculos) {
  const select1 = document.getElementById("selectVeiculo");
  const select2 = document.getElementById("selectVeiculoManutencao");

  const veiculosOrdenados = [...veiculos].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  [select1, select2].forEach((select) => {
    if (!select) return;
    select.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    veiculosOrdenados.forEach((v) => {
      select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
    });
  });
}

function cadastrarVeiculo() {
  const nomeEl = document.getElementById("nomeVeiculo");
  const placaEl = document.getElementById("placaVeiculo");

  const nome = nomeEl.value.trim().toUpperCase();
  const placa = placaEl.value.trim().toUpperCase();

  if (!nome || !placa) {
    alert("PREENCHA NOME E PLACA.");
    return;
  }

  if (DB.veiculos.some(v => v.placa === placa)) {
    alert("PLACA JÁ CADASTRADA.");
    return;
  }

  const novoVeiculo = { nome, placa };
  DB.veiculos.push(novoVeiculo);
  DB.veiculos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));

  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("cadastrarVeiculo", novoVeiculo);

  nomeEl.value = "";
  placaEl.value = "";
  alert("VEÍCULO CADASTRADO COM SUCESSO!");
}

function abrirModalEditar() {
  preencherSelectEditar();
  const modal = document.getElementById("modalEditarVeiculo");
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
}

function fecharModalEditar() {
  const modal = document.getElementById("modalEditarVeiculo");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");

  document.getElementById("selectVeiculoEditar").value = "";
  document.getElementById("nomeVeiculoEditar").value = "";
  document.getElementById("placaVeiculoEditar").value = "";
}

function preencherSelectEditar() {
  const select = document.getElementById("selectVeiculoEditar");
  if (!select) return;

  select.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });
}

function carregarDadosEdicao() {
  const placa = document.getElementById("selectVeiculoEditar").value;
  const veiculo = DB.veiculos.find(v => v.placa === placa);

  document.getElementById("nomeVeiculoEditar").value = veiculo?.nome || "";
  document.getElementById("placaVeiculoEditar").value = veiculo?.placa || "";
}

function salvarEdicaoVeiculo() {
  const placaAntiga = document.getElementById("selectVeiculoEditar").value;
  const nomeNovo = document.getElementById("nomeVeiculoEditar").value.trim().toUpperCase();
  const placaNova = document.getElementById("placaVeiculoEditar").value.trim().toUpperCase();

  if (!placaAntiga || !nomeNovo || !placaNova) {
    alert("PREENCHA TODOS OS CAMPOS.");
    return;
  }

  if (!confirmarSenha()) return;

  if (placaNova !== placaAntiga && DB.veiculos.some(v => v.placa === placaNova)) {
    alert("A NOVA PLACA JÁ ESTÁ CADASTRADA.");
    return;
  }

  const veiculo = DB.veiculos.find(v => v.placa === placaAntiga);
  if (!veiculo) return;

  veiculo.nome = nomeNovo;
  veiculo.placa = placaNova;

  DB.abastecimento.forEach(r => {
    if (r[1] === placaAntiga) {
      r[1] = placaNova;
      r[2] = nomeNovo;
    }
  });

  DB.manutencao.forEach(r => {
    if (r[2] === placaAntiga) {
      r[2] = placaNova;
      r[3] = nomeNovo;
    }
  });

  recalcularConsumoHistorico();
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("editarVeiculo", { placaAntiga, nomeNovo, placaNova });
  fecharModalEditar();
  alert("VEÍCULO E HISTÓRICOS ATUALIZADOS COM SUCESSO!");
}

function excluirVeiculo() {
  const placa = document.getElementById("selectVeiculoEditar").value;
  if (!placa) {
    alert("SELECIONE UM VEÍCULO PARA EXCLUIR.");
    return;
  }

  if (!confirm(`TEM CERTEZA QUE DESEJA EXCLUIR O VEÍCULO ${placa}?\n\nTODOS OS ABASTECIMENTOS E MANUTENÇÕES VINCULADOS TAMBÉM SERÃO EXCLUÍDOS.`)) {
    return;
  }

  if (!confirmarSenha()) return;

  DB.veiculos = DB.veiculos.filter(v => v.placa !== placa);
  DB.abastecimento = DB.abastecimento.filter(r => r[1] !== placa);
  DB.manutencao = DB.manutencao.filter(r => r[2] !== placa);

  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("excluirVeiculo", { placa });
  fecharModalEditar();
  alert("VEÍCULO EXCLUÍDO COM SUCESSO!");
}

// ============================================================
// CONSUMO E ABASTECIMENTO
// ============================================================

function calcularConsumoRegistro(placa, kmAtual, litros, indiceIgnorado = -1) {
  const km = Number(kmAtual);
  const l = Number(litros);

  if (!placa || km <= 0 || l <= 0) return "-";

  const anteriores = DB.abastecimento
    .map((registro, index) => ({ registro, index }))
    .filter(item =>
      item.index !== indiceIgnorado &&
      item.registro[1] === placa &&
      Number(item.registro[6]) < km
    )
    .sort((a, b) => Number(a.registro[6]) - Number(b.registro[6]));

  if (!anteriores.length) return "-";

  const anterior = anteriores[anteriores.length - 1].registro;
  const kmRodado = km - Number(anterior[6]);

  if (kmRodado <= 0) return "0.00";
  return (kmRodado / l).toFixed(2);
}

function recalcularConsumoHistorico() {
  if (!Array.isArray(DB.abastecimento)) {
    DB.abastecimento = [];
    return;
  }

  DB.abastecimento.forEach((registro, index) => {
    registro[7] = calcularConsumoRegistro(registro[1], registro[6], registro[4], index);
  });

  salvarDB();
}

function registrarAbastecimento() {
  const data = document.getElementById("dataAbastecimento").value;
  const placa = document.getElementById("selectVeiculo").value;
  const motorista = document.getElementById("motorista").value.trim().toUpperCase();
  const litros = Number(document.getElementById("litros").value);
  const valor = Number(document.getElementById("valorTotal").value);
  const kmAtual = Number(document.getElementById("kmAtual").value);

  const veiculo = DB.veiculos.find(v => v.placa === placa);
  const nome = veiculo?.nome || "";

  if (!data || !placa || !motorista || litros <= 0 || valor < 0 || kmAtual <= 0) {
    alert("PREENCHA TODOS OS CAMPOS CORRETAMENTE.");
    return;
  }

  const registro = [data, placa, nome, motorista, litros, valor, kmAtual, "-"];

  DB.abastecimento.push(registro);
  recalcularConsumoHistorico();
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("registrarAbastecimento", registro);

  document.getElementById("dataAbastecimento").value = dataHojeInput();
  document.getElementById("selectVeiculo").value = "";
  document.getElementById("motorista").value = "";
  document.getElementById("litros").value = "";
  document.getElementById("valorTotal").value = "";
  document.getElementById("kmAtual").value = "";

  alert("ABASTECIMENTO REGISTRADO COM SUCESSO!");
}

// ============================================================
// MANUTENÇÃO COM ALARME OPCIONAL POR DATA/HORA E OBSERVAÇÃO
// ============================================================

function toggleCamposAlarme() {
  const chk = document.getElementById("chkAtivarAlarme");
  const container = document.getElementById("containerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

function toggleCamposAlarmeEdit() {
  const chk = document.getElementById("editChkAtivarAlarme");
  const container = document.getElementById("editContainerAlarme");
  if (container) {
    container.style.display = chk && chk.checked ? "block" : "none";
  }
}

function abrirModalManutencao() {
  const modal = document.getElementById("modalManutencao");
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
  
  document.getElementById("dataManutencao").value = dataHojeInput();
  if (document.getElementById("horaManutencao")) {
    document.getElementById("horaManutencao").value = horaAgoraInput();
  }

  const chk = document.getElementById("chkAtivarAlarme");
  if (chk) chk.checked = false;
  toggleCamposAlarme();
}

function fecharModalManutencao() {
  const modal = document.getElementById("modalManutencao");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");

  document.getElementById("selectVeiculoManutencao").value = "";
  document.getElementById("nomeVeiculoManutencao").value = "";
  document.getElementById("tipoManutencao").value = "";
  document.getElementById("kmManutencao").value = "";
  document.getElementById("proximaTrocaManutencao").value = "";
  if (document.getElementById("horaManutencao")) {
    document.getElementById("horaManutencao").value = "";
  }
  
  const chk = document.getElementById("chkAtivarAlarme");
  if (chk) chk.checked = false;
  document.getElementById("dataAlarme").value = "";
  if (document.getElementById("horaAlarme")) document.getElementById("horaAlarme").value = "";
  document.getElementById("obsAlarme").value = "";
  toggleCamposAlarme();
}

function carregarNomeVeiculo() {
  const placa = document.getElementById("selectVeiculoManutencao").value;
  const veiculo = DB.veiculos.find(v => v.placa === placa);
  document.getElementById("nomeVeiculoManutencao").value = veiculo?.nome || "";
}

function registrarManutencao() {
  const data = document.getElementById("dataManutencao").value;
  const hora = document.getElementById("horaManutencao")?.value || horaAgoraInput();
  const placa = document.getElementById("selectVeiculoManutencao").value;
  const nome = document.getElementById("nomeVeiculoManutencao").value;
  const tipo = document.getElementById("tipoManutencao").value.trim().toUpperCase();
  const km = document.getElementById("kmManutencao").value ? Number(document.getElementById("kmManutencao").value) : "";
  const proximaTroca = document.getElementById("proximaTrocaManutencao").value ? Number(document.getElementById("proximaTrocaManutencao").value) : "";
  
  const temAlarme = document.getElementById("chkAtivarAlarme")?.checked || false;
  const dataAlarme = temAlarme ? document.getElementById("dataAlarme").value : "";
  const horaAlarme = temAlarme ? (document.getElementById("horaAlarme")?.value || "") : "";
  const obsAlarme = temAlarme ? document.getElementById("obsAlarme").value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA DATA, VEÍCULO E TIPO.");
    return;
  }

  // ESTRUTURA PLANILHA: [DATA, HORA, PLACA, NOME_VEICULO, TIPO, KM, PROXIMA TROCA, ALARME (DATA/HORA), OBSERVAÇÃO]
  const alarmeFormatado = [dataAlarme, horaAlarme].filter(Boolean).join(" ");
  const registro = [data, hora, placa, nome, tipo, km, proximaTroca, alarmeFormatado, obsAlarme];

  DB.manutencao.push(registro);
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("registrarManutencao", registro);
  fecharModalManutencao();
  alert("MANUTENÇÃO REGISTRADA COM SUCESSO!");
}

// ============================================================
// EDITAR MANUTENÇÃO
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
  document.getElementById("editHoraManutencao").value = registro[1] || "";
  document.getElementById("editSelectVeiculoManutencao").value = registro[2] || "";
  
  const veic = DB.veiculos.find(v => v.placa === registro[2]);
  document.getElementById("editNomeVeiculoManutencao").value = veic?.nome || registro[3] || "";
  document.getElementById("editTipoManutencao").value = registro[4] || "";
  document.getElementById("editKmManutencao").value = registro[5] ?? "";
  document.getElementById("editProximaTrocaManutencao").value = registro[6] ?? "";

  const temAlarme = Boolean(registro[7] || registro[8]);
  const chk = document.getElementById("editChkAtivarAlarme");
  chk.checked = temAlarme;
  
  const partesAlarme = (registro[7] || "").split(" ");
  document.getElementById("editDataAlarme").value = partesAlarme[0] || "";
  if (document.getElementById("editHoraAlarme")) {
    document.getElementById("editHoraAlarme").value = partesAlarme[1] || "";
  }
  document.getElementById("editObsAlarme").value = registro[8] || "";

  toggleCamposAlarmeEdit();
  document.getElementById("modalEditarManutencao").style.display = "block";
}

function fecharModalEditarManutencao() {
  const modal = document.getElementById("modalEditarManutencao");
  if (modal) modal.style.display = "none";
}

function carregarNomeVeiculoEdit() {
  const placa = document.getElementById("editSelectVeiculoManutencao").value;
  const veiculo = DB.veiculos.find(v => v.placa === placa);
  document.getElementById("editNomeVeiculoManutencao").value = veiculo?.nome || "";
}

function salvarEdicaoManutencao() {
  const index = Number(document.getElementById("editManutIndex").value);
  const antigo = DB.manutencao[index];
  if (!antigo) return;

  const data = document.getElementById("editDataManutencao").value;
  const hora = document.getElementById("editHoraManutencao").value || horaAgoraInput();
  const placa = document.getElementById("editSelectVeiculoManutencao").value;
  const nome = document.getElementById("editNomeVeiculoManutencao").value;
  const tipo = document.getElementById("editTipoManutencao").value.trim().toUpperCase();
  const km = document.getElementById("editKmManutencao").value !== "" ? Number(document.getElementById("editKmManutencao").value) : "";
  const proximaTroca = document.getElementById("editProximaTrocaManutencao").value !== "" ? Number(document.getElementById("editProximaTrocaManutencao").value) : "";

  const temAlarme = document.getElementById("editChkAtivarAlarme")?.checked || false;
  const dataAlarme = temAlarme ? document.getElementById("editDataAlarme").value : "";
  const horaAlarme = temAlarme ? (document.getElementById("editHoraAlarme")?.value || "") : "";
  const obsAlarme = temAlarme ? document.getElementById("editObsAlarme").value.trim().toUpperCase() : "";

  if (!data || !placa || !tipo) {
    alert("PREENCHA DATA, VEÍCULO E TIPO.");
    return;
  }

  if (!confirmarSenha()) return;

  const alarmeFormatado = [dataAlarme, horaAlarme].filter(Boolean).join(" ");
  const novoRegistro = [data, hora, placa, nome, tipo, km, proximaTroca, alarmeFormatado, obsAlarme];

  DB.manutencao[index] = novoRegistro;
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("editarManutencao", { antigo, novo: novoRegistro });
  fecharModalEditarManutencao();
  alert("MANUTENÇÃO ATUALIZADA COM SUCESSO!");
}

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
          <label for="editSelectVeiculoManutencao">PLACA</label>
          <select id="editSelectVeiculoManutencao" onchange="carregarNomeVeiculoEdit()"></select>
        </div>

        <div class="form-group">
          <label for="editNomeVeiculoManutencao">NOME_VEICULO</label>
          <input type="text" id="editNomeVeiculoManutencao" readonly>
        </div>

        <div class="form-group">
          <label for="editTipoManutencao">TIPO</label>
          <input type="text" id="editTipoManutencao">
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="editKmManutencao">KM</label>
            <input type="number" id="editKmManutencao">
          </div>
          <div class="form-group">
            <label for="editProximaTrocaManutencao">PRÓXIMA TROCA (KM)</label>
            <input type="number" id="editProximaTrocaManutencao">
          </div>
        </div>

        <div class="form-group" style="margin-top: 15px;">
          <label class="checkbox-alarme-label">
            <input type="checkbox" id="editChkAtivarAlarme" onchange="toggleCamposAlarmeEdit()">
            ⏰ DEFINIR ALARME / LEMBRETE
          </label>
        </div>

        <div id="editContainerAlarme" style="display: none; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px dashed #ccc; margin-bottom: 15px;">
          <div class="form-group">
            <label for="editDataAlarme">DEFINIR ALARME / LEMBRETE (DATA / HORA)</label>
            <div class="grid-2">
              <input type="date" id="editDataAlarme">
              <input type="time" id="editHoraAlarme">
            </div>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label for="editObsAlarme">OBSERVAÇÃO (DO ALARME)</label>
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

// ============================================================
// SISTEMA DE ORDENAÇÃO E EXIBIÇÃO DE TABELAS
// ============================================================

function ordenarTabela(indiceColuna) {
  const config = colunaOrdenacao[abaAtiva];
  
  if (config.indice === indiceColuna) {
    config.asc = !config.asc;
  } else {
    config.indice = indiceColuna;
    config.asc = true;
  }

  renderizarTabela();
}

function obterIndicadorOrdem(aba, indice) {
  const config = colunaOrdenacao[aba];
  if (config.indice !== indice) return "";
  return config.asc ? " ▲" : " ▼";
}

function trocarAba(aba) {
  abaAtiva = aba;
  document.getElementById("btnTabAbastecimento").classList.toggle("active", aba === "abastecimento");
  document.getElementById("btnTabManutencao").classList.toggle("active", aba === "manutencao");
  renderizarTabela();
}

function renderizarTabela() {
  if (abaAtiva === "abastecimento") {
    preencherTabelaAbastecimento(DB.abastecimento);
  } else {
    preencherTabelaManutencao(DB.manutencao);
  }
}

function preencherTabelaAbastecimento(dados) {
  const thead = document.getElementById("cabecalhoTabela");
  const tbody = document.querySelector("#tabelaHistorico tbody");
  const c = colunaOrdenacao.abastecimento;

  thead.innerHTML = `
    <th onclick="ordenarTabela(0)" class="th-sortable">DATA${obterIndicadorOrdem('abastecimento', 0)}</th>
    <th onclick="ordenarTabela(1)" class="th-sortable">PLACA${obterIndicadorOrdem('abastecimento', 1)}</th>
    <th onclick="ordenarTabela(2)" class="th-sortable">VEÍCULO${obterIndicadorOrdem('abastecimento', 2)}</th>
    <th onclick="ordenarTabela(3)" class="th-sortable">MOTORISTA${obterIndicadorOrdem('abastecimento', 3)}</th>
    <th onclick="ordenarTabela(4)" class="th-sortable">LITROS${obterIndicadorOrdem('abastecimento', 4)}</th>
    <th onclick="ordenarTabela(5)" class="th-sortable">VALOR${obterIndicadorOrdem('abastecimento', 5)}</th>
    <th onclick="ordenarTabela(6)" class="th-sortable">KM${obterIndicadorOrdem('abastecimento', 6)}</th>
    <th onclick="ordenarTabela(7)" class="th-sortable">CONSUMO${obterIndicadorOrdem('abastecimento', 7)}</th>
    <th>AÇÕES</th>
  `;

  tbody.innerHTML = "";

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9">NENHUM ABASTECIMENTO REGISTRADO</td></tr>';
    return;
  }

  let dadosOrdenados = dados.map((item, indexOriginal) => ({ item, indexOriginal }));

  dadosOrdenados.sort((a, b) => {
    let valA = a.item[c.indice];
    let valB = b.item[c.indice];

    if ([4, 5, 6].includes(c.indice)) {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else if (c.indice === 7) {
      valA = valA === "-" ? -1 : Number(valA);
      valB = valB === "-" ? -1 : Number(valB);
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
    tr.insertCell().textContent = r[1];
    tr.insertCell().textContent = r[2];
    tr.insertCell().textContent = r[3];
    tr.insertCell().textContent = `${Number(r[4]).toFixed(2)} L`;
    tr.insertCell().textContent = `R$ ${Number(r[5]).toFixed(2)}`;
    tr.insertCell().textContent = `${r[6]} KM`;
    tr.insertCell().textContent = r[7] !== "-" ? `${r[7]} KM/L` : "-";

    const td = tr.insertCell();
    td.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'abast_${indexOriginal}')">MAIS</button>
        <div class="dropdown-content" id="dropdownabast_${indexOriginal}">
          <button type="button" onclick="abrirModalEditarAbastecimento(${indexOriginal})">EDITAR</button>
          <button type="button" onclick="excluirAbastecimento(${indexOriginal})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

function preencherTabelaManutencao(dados) {
  const thead = document.getElementById("cabecalhoTabela");
  const tbody = document.querySelector("#tabelaHistorico tbody");
  const c = colunaOrdenacao.manutencao;

  thead.innerHTML = `
    <th onclick="ordenarTabela(0)" class="th-sortable">DATA / HORA${obterIndicadorOrdem('manutencao', 0)}</th>
    <th onclick="ordenarTabela(2)" class="th-sortable">PLACA${obterIndicadorOrdem('manutencao', 2)}</th>
    <th onclick="ordenarTabela(3)" class="th-sortable">VEÍCULO${obterIndicadorOrdem('manutencao', 3)}</th>
    <th onclick="ordenarTabela(4)" class="th-sortable">TIPO${obterIndicadorOrdem('manutencao', 4)}</th>
    <th onclick="ordenarTabela(5)" class="th-sortable">KM${obterIndicadorOrdem('manutencao', 5)}</th>
    <th onclick="ordenarTabela(6)" class="th-sortable">PRÓXIMA TROCA (KM)${obterIndicadorOrdem('manutencao', 6)}</th>
    <th onclick="ordenarTabela(7)" class="th-sortable">DATA ALARME${obterIndicadorOrdem('manutencao', 7)}</th>
    <th onclick="ordenarTabela(8)" class="th-sortable">OBS ALARME${obterIndicadorOrdem('manutencao', 8)}</th>
    <th>AÇÕES</th>
  `;

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
    const dataHoraRegistro = `${formatarData(r[0])} ${r[1] ? r[1] : ''}`.trim();

    tr.insertCell().textContent = dataHoraRegistro;
    tr.insertCell().textContent = r[2];
    tr.insertCell().textContent = r[3];
    tr.insertCell().textContent = r[4];
    tr.insertCell().textContent = r[5] !== "" && r[5] !== undefined ? `${r[5]} KM` : "-";
    tr.insertCell().textContent = r[6] !== "" && r[6] !== undefined ? `${r[6]} KM` : "-";
    tr.insertCell().textContent = r[7] ? formatarData(r[7]) : "-";
    tr.insertCell().textContent = r[8] ? r[8] : "-";

    const td = tr.insertCell();
    td.innerHTML = `
      <div class="dropdown">
        <button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${indexOriginal}')">MAIS</button>
        <div class="dropdown-content" id="dropdownmanut_${indexOriginal}">
          <button type="button" onclick="abrirModalEditarManutencao(${indexOriginal})">EDITAR</button>
          <button type="button" onclick="excluirManutencao(${indexOriginal})">EXCLUIR</button>
        </div>
      </div>
    `;
  });
}

function formatarData(data) {
  if (!data) return "";
  const texto = String(data);
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split("-");
    return `${dia}/${mes}/${ano}`;
  }
  return texto;
}

function toggleDropdown(event, idStr) {
  event.stopPropagation();
  document.querySelectorAll(".dropdown-content").forEach(menu => menu.classList.remove("show"));
  const menu = document.getElementById("dropdown" + idStr);
  if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-content").forEach(menu => menu.classList.remove("show"));
});

// ============================================================
// EXCLUSÃO DE DADOS
// ============================================================

function excluirAbastecimento(index) {
  const item = DB.abastecimento[index];
  if (!item) return;

  if (!confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTE ABASTECIMENTO?")) return;
  if (!confirmarSenha()) return;

  DB.abastecimento.splice(index, 1);
  recalcularConsumoHistorico();
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("excluirAbastecimento", { item });
  alert("ABASTECIMENTO EXCLUÍDO COM SUCESSO!");
}

function excluirManutencao(index) {
  const item = DB.manutencao[index];
  if (!item) return;

  if (!confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTA MANUTENÇÃO?")) return;
  if (!confirmarSenha()) return;

  DB.manutencao.splice(index, 1);
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("excluirManutencao", { item });
  alert("MANUTENÇÃO EXCLUÍDA COM SUCESSO!");
}

// ============================================================
// EDITAR ABASTECIMENTO
// ============================================================

function abrirModalEditarAbastecimento(index) {
  const registro = DB.abastecimento[index];
  if (!registro) return;

  if (!document.getElementById("modalEditarAbastecimento")) {
    criarModalEditarAbastecimento();
  }

  const select = document.getElementById("editSelectVeiculo");
  select.innerHTML = "";

  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    select.add(new Option(`${v.nome} - ${v.placa}`, v.placa));
  });

  document.getElementById("editAbastIndex").value = index;
  document.getElementById("editDataAbastecimento").value = registro[0];
  document.getElementById("editSelectVeiculo").value = registro[1];
  document.getElementById("editMotorista").value = registro[3];
  document.getElementById("editLitros").value = registro[4];
  document.getElementById("editValorTotal").value = registro[5];
  document.getElementById("editKmAtual").value = registro[6];

  document.getElementById("modalEditarAbastecimento").style.display = "block";
}

function fecharModalEditarAbastecimento() {
  const modal = document.getElementById("modalEditarAbastecimento");
  if (modal) modal.style.display = "none";
}

function salvarEdicaoAbastecimento() {
  const index = Number(document.getElementById("editAbastIndex").value);
  const antigo = DB.abastecimento[index];
  if (!antigo) return;

  const data = document.getElementById("editDataAbastecimento").value;
  const placa = document.getElementById("editSelectVeiculo").value;
  const nome = document.getElementById("editSelectVeiculo").selectedOptions[0]?.text.split(" - ")[0] || "";
  const motorista = document.getElementById("editMotorista").value.trim().toUpperCase();
  const litros = Number(document.getElementById("editLitros").value);
  const valor = Number(document.getElementById("editValorTotal").value);
  const kmAtual = Number(document.getElementById("editKmAtual").value);

  if (!data || !placa || !motorista || litros <= 0 || kmAtual <= 0) {
    alert("PREENCHA CORRETAMENTE DATA, VEÍCULO, MOTORISTA, LITROS E KM.");
    return;
  }

  if (!confirmarSenha()) return;

  const novoRegistro = [data, placa, nome, motorista, litros, valor, kmAtual, "-"];

  DB.abastecimento[index] = novoRegistro;
  recalcularConsumoHistorico();
  salvarDB();
  carregarDados();

  enviarParaGoogleSheets("editarAbastecimento", { antigo, novo: novoRegistro });
  fecharModalEditarAbastecimento();
  alert("ABASTECIMENTO ATUALIZADO COM SUCESSO!");
}

function criarModalEditarAbastecimento() {
  const html = `
    <div id="modalEditarAbastecimento" class="modal">
      <div class="modal-content">
        <button type="button" class="close" onclick="fecharModalEditarAbastecimento()" aria-label="Fechar">&times;</button>
        <h2>EDITAR ABASTECIMENTO</h2>
        <input type="hidden" id="editAbastIndex">
        <div class="form-group">
          <label for="editDataAbastecimento">DATA</label>
          <input type="date" id="editDataAbastecimento">
        </div>
        <div class="form-group">
          <label for="editSelectVeiculo">VEÍCULO</label>
          <select id="editSelectVeiculo"></select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label for="editMotorista">MOTORISTA</label>
            <input type="text" id="editMotorista">
          </div>
          <div class="form-group">
            <label for="editLitros">LITROS</label>
            <input type="number" step="0.01" min="0" id="editLitros">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label for="editValorTotal">VALOR TOTAL R$</label>
            <input type="number" step="0.01" min="0" id="editValorTotal">
          </div>
          <div class="form-group">
            <label for="editKmAtual">KM ATUAL</label>
            <input type="number" min="0" id="editKmAtual">
          </div>
        </div>
        <div class="btn-group">
          <button type="button" class="btn btn-primary" onclick="salvarEdicaoAbastecimento()">SALVAR</button>
          <button type="button" class="btn btn-secondary" onclick="fecharModalEditarAbastecimento()">CANCELAR</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", html);
}

// ============================================================
// RELATÓRIOS PDF
// ============================================================

function gerarHTMLPDF(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]), "pt-BR");
    return String(a[0]).localeCompare(String(b[0]));
  });

  const totalLitros = registros.reduce((sum, r) => sum + (Number(r[4]) || 0), 0);
  const totalValor = registros.reduce((sum, r) => sum + (Number(r[5]) || 0), 0);

  let linhas = "";
  let veiculoAtual = "";

  registros.forEach(r => {
    if (veiculoAtual !== r[2]) {
      veiculoAtual = r[2];
      linhas += `<tr class="cabecalho-veiculo"><td colspan="8">VEÍCULO: ${escaparHTML(r[2])} — PLACA: ${escaparHTML(r[1])}</td></tr>`;
    }
    linhas += `
      <tr>
        <td>${escaparHTML(formatarData(r[0]))}</td>
        <td><strong>${escaparHTML(r[1])}</strong></td>
        <td>${escaparHTML(r[2])}</td>
        <td>${escaparHTML(r[3] || "-")}</td>
        <td>${Number(r[4]).toFixed(2)} L</td>
        <td>R$ ${Number(r[5]).toFixed(2)}</td>
        <td>${escaparHTML(r[6])} KM</td>
        <td>${r[7] !== "-" ? `${escaparHTML(r[7])} KM/L` : "-"}</td>
      </tr>`;
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escaparHTML(titulo)}</title>
<style>
body{font-family:Arial,sans-serif;margin:30px;color:#2c3e50}
h1{color:#1565c0;font-size:20px}
.header{border-bottom:3px solid #1565c0;padding-bottom:15px;margin-bottom:20px}
.cards{display:flex;gap:15px;margin-bottom:25px}
.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:12px}
.card span{display:block;font-size:10px;color:#666;text-transform:uppercase}
.card strong{font-size:16px;color:#1565c0}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#1565c0;color:#fff;padding:9px}
td{padding:8px;border-bottom:1px solid #eee;text-align:center}
.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}
@media print{@page{margin:1.5cm}body{margin:0}}
</style>
</head>
<body>
<div class="header">
  <h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1>
  <div>${escaparHTML(titulo)}</div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards">
  <div class="card"><span>Total Registros</span><strong>${registros.length}</strong></div>
  <div class="card"><span>Total Combustível</span><strong>${totalLitros.toFixed(2)} L</strong></div>
  <div class="card"><span>Investimento Total</span><strong>R$ ${totalValor.toFixed(2)}</strong></div>
</div>
<table>
<thead><tr><th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>CONSUMO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;
}

function gerarHTMLPDFManutencao(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[3] !== b[3]) return String(a[3]).localeCompare(String(b[3]), "pt-BR");
    return String(a[0]).localeCompare(String(b[0]));
  });

  let linhas = "";
  let veiculoAtual = "";

  registros.forEach(r => {
    if (veiculoAtual !== r[3]) {
      veiculoAtual = r[3];
      linhas += `<tr class="cabecalho-veiculo"><td colspan="8">VEÍCULO: ${escaparHTML(r[3])} — PLACA: ${escaparHTML(r[2])}</td></tr>`;
    }
    const dataHora = `${formatarData(r[0])} ${r[1] || ''}`.trim();
    linhas += `
      <tr>
        <td>${escaparHTML(dataHora)}</td>
        <td><strong>${escaparHTML(r[2])}</strong></td>
        <td>${escaparHTML(r[3])}</td>
        <td>${escaparHTML(r[4] || "-")}</td>
        <td>${r[5] !== "" && r[5] !== undefined ? `${escaparHTML(r[5])} KM` : "-"}</td>
        <td>${r[6] !== "" && r[6] !== undefined ? `${escaparHTML(r[6])} KM` : "-"}</td>
        <td>${r[7] ? formatarData(r[7]) : "-"}</td>
        <td>${escaparHTML(r[8] || "-")}</td>
      </tr>`;
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escaparHTML(titulo)}</title>
<style>
body{font-family:Arial,sans-serif;margin:30px;color:#2c3e50}
h1{color:#1565c0;font-size:20px}
.header{border-bottom:3px solid #1565c0;padding-bottom:15px;margin-bottom:20px}
.cards{display:flex;gap:15px;margin-bottom:25px}
.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:12px}
.card span{display:block;font-size:10px;color:#666;text-transform:uppercase}
.card strong{font-size:16px;color:#1565c0}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#1565c0;color:#fff;padding:9px}
td{padding:8px;border-bottom:1px solid #eee;text-align:center}
.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}
@media print{@page{margin:1.5cm}body{margin:0}}
</style>
</head>
<body>
<div class="header">
  <h1>AG4 FROTA — HISTÓRICO DE MANUTENÇÃO</h1>
  <div>${escaparHTML(titulo)}</div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards">
  <div class="card"><span>Total de Manutenções</span><strong>${registros.length}</strong></div>
</div>
<table>
<thead><tr><th>DATA/HORA REGISTRO</th><th>PLACA</th><th>VEÍCULO</th><th>TIPO SERVIÇO</th><th>KM</th><th>PRÓXIMA TROCA</th><th>DATA ALARME</th><th>OBSERVAÇÃO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;
}

function abrirNovaAbaComPDF(html) {
  const aba = window.open("", "_blank");
  if (!aba) {
    alert("O navegador bloqueou a janela do PDF. Permita pop-ups.");
    return;
  }
  aba.document.open();
  aba.document.write(html);
  aba.document.close();
}

function gerarPDFGeral() {
  if (abaAtiva === "abastecimento") {
    if (!DB.abastecimento.length) return alert("NÃO HÁ DADOS DE ABASTECIMENTO.");
    abrirNovaAbaComPDF(gerarHTMLPDF(DB.abastecimento, "RELATÓRIO GERAL DE ABASTECIMENTO"));
  } else {
    if (!DB.manutencao.length) return alert("NÃO HÁ DADOS DE MANUTENÇÃO.");
    abrirNovaAbaComPDF(gerarHTMLPDFManutencao(DB.manutencao, "RELATÓRIO GERAL DE MANUTENÇÃO"));
  }
}

function abrirModalSeletiva() {
  const container = document.getElementById("listaCheckboxesVeiculos");
  container.innerHTML = "";

  if (!listaVeiculosGlobal.length) return alert("NÃO HÁ VEÍCULOS CADASTRADOS.");

  const veiculosOrdenados = [...listaVeiculosGlobal].sort((a, b) => 
    (a.nome || "").localeCompare(b.nome || "", 'pt-BR')
  );

  veiculosOrdenados.forEach(v => {
    const div = document.createElement("div");
    div.className = "checkbox-item";
    div.innerHTML = `
      <label>
        <input type="checkbox" value="${escaparHTML(v.placa)}">
        <span>${escaparHTML(v.nome)} - ${escaparHTML(v.placa)}</span>
      </label>
    `;
    container.appendChild(div);
  });

  const modal = document.getElementById("modalSeletiva");
  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
}

function fecharModalSeletiva() {
  const modal = document.getElementById("modalSeletiva");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
}

function gerarPDFSeletiva() {
  const placas = Array.from(
    document.querySelectorAll("#listaCheckboxesVeiculos input:checked")
  ).map(cb => cb.value);

  if (!placas.length) return alert("SELECIONE PELO MENOS 1 VEÍCULO.");

  const nomes = listaVeiculosGlobal
    .filter(v => placas.includes(v.placa))
    .map(v => v.nome)
    .join(", ");

  if (abaAtiva === "abastecimento") {
    const dados = DB.abastecimento.filter(r => placas.includes(r[1]));
    if (!dados.length) return alert("NENHUM ABASTECIMENTO ENCONTRADO.");
    abrirNovaAbaComPDF(gerarHTMLPDF(dados, `RELATÓRIO SELETIVO: ${nomes}`));
  } else {
    const dados = DB.manutencao.filter(r => placas.includes(r[2]));
    if (!dados.length) return alert("NENHUMA MANUTENÇÃO ENCONTRADA.");
    abrirNovaAbaComPDF(gerarHTMLPDFManutencao(dados, `RELATÓRIO SELETIVO: ${nomes}`));
  }

  fecharModalSeletiva();
}

window.addEventListener("click", (event) => {
  document.querySelectorAll(".modal").forEach(modal => {
    if (event.target === modal && modal.id !== "telaLogin") {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  });
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  document.querySelectorAll(".modal").forEach(modal => {
    if (modal.id !== "telaLogin") {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    }
  });
});
