const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw-pr-h9sOshx1qvI7B3G7CrIvZhfq1p3KYlXedW0gZJzsc0Gm7QVK9u4LmrecmaPnAwg/exec";
const STORAGE_KEY = "ag4_frota", USER_KEY = "ag4_usuario_logado", SENHA_MESTRE = "frot@AG4";
let DB = carregarDB(), listaVeiculosGlobal = [], abaAtiva = "abastecimento";

function carregarDB() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return d && typeof d === "object" ? { veiculos: Array.isArray(d.veiculos) ? d.veiculos : [], abastecimento: Array.isArray(d.abastecimento) ? d.abastecimento : [], manutencao: Array.isArray(d.manutencao) ? d.manutencao : [] } : { veiculos: [], abastecimento: [], manutencao: [] };
  } catch (e) { return { veiculos: [], abastecimento: [], manutencao: [] }; }
}

function salvarDB() { localStorage.setItem(STORAGE_KEY, JSON.stringify(DB)); }
function dataHojeInput() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function escaparHTML(str) { return String(str ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

function parseKmNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;
  let str = String(valor).replace(/\./g, "").replace(",", ".");
  return parseFloat(str) || 0;
}

function formatarKmExibicao(valor) {
  const num = parseKmNumero(valor);
  return num ? num.toLocaleString("pt-BR") + " KM" : "-";
}

async function enviarParaGoogleSheets(acao, dados) {
  try {
    await fetch(APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ acao, dados }) });
    return true;
  } catch (e) { alert("Erro ao conectar com o servidor."); return false; }
}

async function sincronizarComNuvem() {
  mostrarLoading(true);
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ acao: "obterDados" }) });
    const json = await res.json();
    if (json.ok && json.DB) { DB = json.DB; salvarDB(); carregarDados(); }
  } catch (e) { console.error(e); } finally { mostrarLoading(false); }
}

async function fazerLogin(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim(), senha = document.getElementById("loginSenha").value.trim(), erro = document.getElementById("loginErro");
  if (!email || !senha) { erro.textContent = "PREENCHA E-MAIL E SENHA."; erro.style.display = "block"; return; }
  erro.style.display = "none"; mostrarLoading(true);
  try {
    const res = await fetch(APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ acao: "fazerLogin", dados: { email, senha } }) });
    const json = await res.json();
    if (json.ok) { localStorage.setItem(USER_KEY, JSON.stringify(json.usuario || { email })); exibirApp(json.usuario); sincronizarComNuvem(); }
    else { erro.textContent = json.mensagem || "E-MAIL OU SENHA INCORRETOS."; erro.style.display = "block"; }
  } catch (e) { erro.textContent = "ERRO AO CONECTAR COM O SERVIDOR."; erro.style.display = "block"; } finally { mostrarLoading(false); }
}

function fazerLogout() {
  if (confirm("DESEJA REALMENTE SAIR DO SISTEMA?")) {
    localStorage.removeItem(USER_KEY);
    document.getElementById("telaLogin").style.display = "flex";
    document.getElementById("appContainer").style.display = "none";
  }
}

function exibirApp(usr) {
  document.getElementById("telaLogin").style.display = "none";
  document.getElementById("appContainer").style.display = "block";
  if (usr?.nome) document.getElementById("nomeUsuarioLogado").textContent = `USUÁRIO: ${usr.nome.toUpperCase()}`;
}

function mostrarLoading(v) { const el = document.getElementById("loadingSpinner"); if (el) el.style.display = v ? "flex" : "none"; }

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("dataAbastecimento").value = dataHojeInput();
  document.getElementById("dataManutencao").value = dataHojeInput();
  document.addEventListener("input", e => { if (e.target?.type === "text" && e.target.id !== "loginEmail") e.target.value = e.target.value.toUpperCase(); });
  const usr = JSON.parse(localStorage.getItem(USER_KEY));
  usr ? (exibirApp(usr), carregarDados(), sincronizarComNuvem()) : (document.getElementById("telaLogin").style.display = "flex", document.getElementById("appContainer").style.display = "none");
});

function carregarDados() {
  DB.veiculos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  listaVeiculosGlobal = DB.veiculos;
  recalcularConsumoHistorico(); preencherSelects(DB.veiculos); renderizarTabela();
}

function confirmarSenha() {
  const s = prompt("DIGITE A SENHA DE CONFIRMAÇÃO PARA CONTINUAR:");
  return s !== null && (s === SENHA_MESTRE || (alert("SENHA INCORRETA!"), false));
}

function preencherSelects(v) {
  const s1 = document.getElementById("selectVeiculo"), s2 = document.getElementById("selectVeiculoManutencao");
  const opts = [...v].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  [s1, s2].forEach(s => {
    if (!s) return;
    s.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    opts.forEach(i => s.add(new Option(`${i.nome} - ${i.placa}`, i.placa)));
  });
}

function cadastrarVeiculo() {
  const n = document.getElementById("nomeVeiculo"), p = document.getElementById("placaVeiculo");
  const nome = n.value.trim().toUpperCase(), placa = p.value.trim().toUpperCase();
  if (!nome || !placa) return alert("PREENCHA NOME E PLACA.");
  if (DB.veiculos.some(v => v.placa === placa)) return alert("PLACA JÁ CADASTRADA.");
  const obj = { nome, placa };
  DB.veiculos.push(obj); DB.veiculos.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
  salvarDB(); carregarDados(); enviarParaGoogleSheets("cadastrarVeiculo", obj);
  n.value = ""; p.value = ""; alert("VEÍCULO CADASTRADO COM SUCESSO!");
}

function abrirModalEditar() {
  const el = document.getElementById("selectVeiculoEditar");
  if (el) {
    el.innerHTML = '<option value="">SELECIONE UM VEÍCULO</option>';
    [...listaVeiculosGlobal].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).forEach(v => el.add(new Option(`${v.nome} - ${v.placa}`, v.placa)));
  }
  const m = document.getElementById("modalEditarVeiculo"); m.style.display = "block"; m.setAttribute("aria-hidden", "false");
}

function fecharModalEditar() {
  const m = document.getElementById("modalEditarVeiculo"); m.style.display = "none"; m.setAttribute("aria-hidden", "true");
  document.getElementById("selectVeiculoEditar").value = ""; document.getElementById("nomeVeiculoEditar").value = ""; document.getElementById("placaVeiculoEditar").value = "";
}

function carregarDadosEdicao() {
  const p = document.getElementById("selectVeiculoEditar").value, v = DB.veiculos.find(i => i.placa === p);
  document.getElementById("nomeVeiculoEditar").value = v?.nome || ""; document.getElementById("placaVeiculoEditar").value = v?.placa || "";
}

function salvarEdicaoVeiculo() {
  const pAntiga = document.getElementById("selectVeiculoEditar").value, nNovo = document.getElementById("nomeVeiculoEditar").value.trim().toUpperCase(), pNova = document.getElementById("placaVeiculoEditar").value.trim().toUpperCase();
  if (!pAntiga || !nNovo || !pNova) return alert("PREENCHA TODOS OS CAMPOS.");
  if (!confirmarSenha()) return;
  if (pNova !== pAntiga && DB.veiculos.some(v => v.placa === pNova)) return alert("A NOVA PLACA JÁ ESTÁ CADASTRADA.");
  const v = DB.veiculos.find(i => i.placa === pAntiga);
  if (v) {
    v.nome = nNovo; v.placa = pNova;
    DB.abastecimento.forEach(a => { if (a[1] === pAntiga) { a[1] = pNova; a[2] = nNovo; } });
    DB.manutencao.forEach(m => { if (m[1] === pAntiga) { m[1] = pNova; m[2] = nNovo; } });
    recalcularConsumoHistorico(); salvarDB(); carregarDados();
    enviarParaGoogleSheets("editarVeiculo", { placaAntiga: pAntiga, nomeNovo: nNovo, placaNova: pNova });
    fecharModalEditar(); alert("VEÍCULO ATUALIZADO COM SUCESSO!");
  }
}

function excluirVeiculo() {
  const p = document.getElementById("selectVeiculoEditar").value;
  if (!p) return alert("SELECIONE UM VEÍCULO PARA EXCLUIR.");
  if (!confirm(`TEM CERTEZA QUE DESEJA EXCLUIR O VEÍCULO ${p}?`) || !confirmarSenha()) return;
  DB.veiculos = DB.veiculos.filter(v => v.placa !== p);
  DB.abastecimento = DB.abastecimento.filter(a => a[1] !== p);
  DB.manutencao = DB.manutencao.filter(m => m[1] !== p);
  salvarDB(); carregarDados(); enviarParaGoogleSheets("excluirVeiculo", { placa: p });
  fecharModalEditar(); alert("VEÍCULO EXCLUÍDO COM SUCESSO!");
}

function calcularConsumoRegistro(placa, kmAtual, litros, idxIgnorador = -1) {
  const km = parseKmNumero(kmAtual), l = Number(litros);
  if (!placa || km <= 0 || l <= 0) return "-";
  const prev = DB.abastecimento.map((r, i) => ({ r, i })).filter(x => x.i !== idxIgnorador && x.r[1] === placa && parseKmNumero(x.r[6]) < km).sort((a, b) => parseKmNumero(a.r[6]) - parseKmNumero(b.r[6]));
  if (!prev.length) return "-";
  const diff = km - parseKmNumero(prev[prev.length - 1].r[6]);
  return diff <= 0 ? "0.00" : (diff / l).toFixed(2);
}

function recalcularConsumoHistorico() {
  if (!Array.isArray(DB.abastecimento)) DB.abastecimento = [];
  DB.abastecimento.forEach((r, i) => { r[7] = calcularConsumoRegistro(r[1], r[6], r[4], i); });
  salvarDB();
}

function registrarAbastecimento() {
  const dt = document.getElementById("dataAbastecimento").value, pl = document.getElementById("selectVeiculo").value, mot = document.getElementById("motorista").value.trim().toUpperCase();
  const lit = Number(document.getElementById("litros").value), val = Number(document.getElementById("valorTotal").value), km = parseKmNumero(document.getElementById("kmAtual").value);
  const vNome = DB.veiculos.find(v => v.placa === pl)?.nome || "";
  if (!dt || !pl || !mot || lit <= 0 || val < 0 || km <= 0) return alert("PREENCHA TODOS OS CAMPOS CORRETAMENTE.");
  const reg = [dt, pl, vNome, mot, lit, val, km, "-"];
  DB.abastecimento.push(reg); recalcularConsumoHistorico(); salvarDB(); carregarDados();
  enviarParaGoogleSheets("registrarAbastecimento", reg);
  document.getElementById("dataAbastecimento").value = dataHojeInput(); document.getElementById("selectVeiculo").value = "";
  document.getElementById("motorista").value = ""; document.getElementById("litros").value = ""; document.getElementById("valorTotal").value = ""; document.getElementById("kmAtual").value = "";
  alert("ABASTECIMENTO REGISTRADO COM SUCESSO!");
}

function abrirModalManutencao() {
  const m = document.getElementById("modalManutencao"); m.style.display = "block"; m.setAttribute("aria-hidden", "false");
  document.getElementById("dataManutencao").value = dataHojeInput();
}

function fecharModalManutencao() {
  const m = document.getElementById("modalManutencao"); m.style.display = "none"; m.setAttribute("aria-hidden", "true");
  document.getElementById("selectVeiculoManutencao").value = ""; document.getElementById("nomeVeiculoManutencao").value = "";
  document.getElementById("tipoManutencao").value = ""; document.getElementById("kmManutencao").value = ""; document.getElementById("proximaTrocaKm").value = "";
}

function carregarNomeVeiculo() {
  const p = document.getElementById("selectVeiculoManutencao").value, v = DB.veiculos.find(i => i.placa === p);
  document.getElementById("nomeVeiculoManutencao").value = v?.nome || "";
}

function registrarManutencao() {
  const dt = document.getElementById("dataManutencao").value, pl = document.getElementById("selectVeiculoManutencao").value, nm = document.getElementById("nomeVeiculoManutencao").value;
  const tp = document.getElementById("tipoManutencao").value.trim().toUpperCase(), km = parseKmNumero(document.getElementById("kmManutencao").value) || "", px = parseKmNumero(document.getElementById("proximaTrocaKm").value) || "";
  if (!dt || !pl || !tp) return alert("PREENCHA DATA, VEÍCULO E TIPO.");
  const reg = [dt, pl, nm, tp, km, px];
  DB.manutencao.push(reg); salvarDB(); carregarDados(); enviarParaGoogleSheets("registrarManutencao", reg);
  fecharModalManutencao(); alert("MANUTENÇÃO REGISTRADA COM SUCESSO!");
}

function trocarAba(aba) {
  abaAtiva = aba;
  document.getElementById("btnTabAbastecimento").classList.toggle("active", aba === "abastecimento");
  document.getElementById("btnTabManutencao").classList.toggle("active", aba === "manutencao");
  renderizarTabela();
}

function renderizarTabela() { abaAtiva === "abastecimento" ? preencherTabelaAbastecimento(DB.abastecimento) : preencherTabelaManutencao(DB.manutencao); }

function preencherTabelaAbastecimento(dados) {
  const head = document.getElementById("cabecalhoTabela"), body = document.querySelector("#tabelaHistorico tbody");
  head.innerHTML = "<th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>CONSUMO</th><th>AÇÕES</th>";
  body.innerHTML = "";
  if (!dados.length) { body.innerHTML = '<tr><td colspan="9">NENHUM ABASTECIMENTO REGISTRADO</td></tr>'; return; }
  dados.forEach((r, i) => {
    const tr = body.insertRow();
    tr.insertCell().textContent = formatarData(r[0]); tr.insertCell().textContent = r[1]; tr.insertCell().textContent = r[2]; tr.insertCell().textContent = r[3];
    tr.insertCell().textContent = `${Number(r[4]).toFixed(2)} L`; tr.insertCell().textContent = `R$ ${Number(r[5]).toFixed(2)}`;
    tr.insertCell().textContent = formatarKmExibicao(r[6]); tr.insertCell().textContent = r[7] !== "-" ? `${r[7]} KM/L` : "-";
    tr.insertCell().innerHTML = `<div class="dropdown"><button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'abast_${i}')">MAIS</button><div class="dropdown-content" id="dropdownabast_${i}"><button type="button" onclick="abrirModalEditarAbastecimento(${i})">EDITAR</button><button type="button" onclick="excluirAbastecimento(${i})">EXCLUIR</button></div></div>`;
  });
}

function preencherTabelaManutencao(dados) {
  const head = document.getElementById("cabecalhoTabela"), body = document.querySelector("#tabelaHistorico tbody");
  head.innerHTML = "<th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>TIPO SERVIÇO</th><th>KM ATUAL</th><th>PRÓX. TROCA</th><th>AÇÕES</th>";
  body.innerHTML = "";
  if (!dados.length) { body.innerHTML = '<tr><td colspan="7">NENHUMA MANUTENÇÃO REGISTRADA</td></tr>'; return; }
  dados.forEach((r, i) => {
    const tr = body.insertRow();
    tr.insertCell().textContent = formatarData(r[0]); tr.insertCell().textContent = r[1]; tr.insertCell().textContent = r[2]; tr.insertCell().textContent = r[3];
    tr.insertCell().textContent = r[4] ? formatarKmExibicao(r[4]) : "-"; tr.insertCell().textContent = r[5] ? formatarKmExibicao(r[5]) : "-";
    tr.insertCell().innerHTML = `<div class="dropdown"><button type="button" class="btn btn-primary action-btn" onclick="toggleDropdown(event, 'manut_${i}')">MAIS</button><div class="dropdown-content" id="dropdownmanut_${i}"><button type="button" onclick="excluirManutencao(${i})">EXCLUIR</button></div></div>`;
  });
}

function formatarData(d) {
  if (!d) return "";
  const str = String(d);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) { const [y, m, day] = str.split("-"); return `${day}/${m}/${y}`; }
  return str;
}

function toggleDropdown(e, id) {
  e.stopPropagation(); document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show"));
  const target = document.getElementById("dropdown" + id); if (target) target.classList.toggle("show");
}

document.addEventListener("click", () => document.querySelectorAll(".dropdown-content").forEach(el => el.classList.remove("show")));

function excluirAbastecimento(i) {
  const item = DB.abastecimento[i];
  if (item && confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTE ABASTECIMENTO?") && confirmarSenha()) {
    DB.abastecimento.splice(i, 1); recalcularConsumoHistorico(); salvarDB(); carregarDados();
    enviarParaGoogleSheets("excluirAbastecimento", { item }); alert("ABASTECIMENTO EXCLUÍDO COM SUCESSO!");
  }
}

function excluirManutencao(i) {
  const item = DB.manutencao[i];
  if (item && confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTA MANUTENÇÃO?") && confirmarSenha()) {
    DB.manutencao.splice(i, 1); salvarDB(); carregarDados();
    enviarParaGoogleSheets("excluirManutencao", { item }); alert("MANUTENÇÃO EXCLUÍDA COM SUCESSO!");
  }
}

function abrirModalEditarAbastecimento(i) {
  const item = DB.abastecimento[i]; if (!item) return;
  if (!document.getElementById("modalEditarAbastecimento")) criarModalEditarAbastecimento();
  const select = document.getElementById("editSelectVeiculo"); select.innerHTML = "";
  [...listaVeiculosGlobal].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).forEach(v => select.add(new Option(`${v.nome} - ${v.placa}`, v.placa)));
  document.getElementById("editAbastIndex").value = i; document.getElementById("editDataAbastecimento").value = item[0];
  document.getElementById("editSelectVeiculo").value = item[1]; document.getElementById("editMotorista").value = item[3];
  document.getElementById("editLitros").value = item[4]; document.getElementById("editValorTotal").value = item[5];
  document.getElementById("editKmAtual").value = item[6]; document.getElementById("modalEditarAbastecimento").style.display = "block";
}

function fecharModalEditarAbastecimento() { const m = document.getElementById("modalEditarAbastecimento"); if (m) m.style.display = "none"; }

function salvarEdicaoAbastecimento() {
  const i = Number(document.getElementById("editAbastIndex").value), antigo = DB.abastecimento[i]; if (!antigo) return;
  const dt = document.getElementById("editDataAbastecimento").value, pl = document.getElementById("editSelectVeiculo").value;
  const nm = document.getElementById("editSelectVeiculo").selectedOptions[0]?.text.split(" - ")[0] || "";
  const mot = document.getElementById("editMotorista").value.trim().toUpperCase(), lit = Number(document.getElementById("editLitros").value);
  const val = Number(document.getElementById("editValorTotal").value), km = parseKmNumero(document.getElementById("editKmAtual").value);
  if (!dt || !pl || !mot || lit <= 0 || km <= 0) return alert("PREENCHA CORRETAMENTE OS CAMPOS.");
  if (!confirmarSenha()) return;
  const novo = [dt, pl, nm, mot, lit, val, km, "-"];
  DB.abastecimento[i] = novo; recalcularConsumoHistorico(); salvarDB(); carregarDados();
  enviarParaGoogleSheets("editarAbastecimento", { antigo, novo }); fecharModalEditarAbastecimento(); alert("ABASTECIMENTO ATUALIZADO COM SUCESSO!");
}

function criarModalEditarAbastecimento() {
  document.body.insertAdjacentHTML("beforeend", `<div id="modalEditarAbastecimento" class="modal"><div class="modal-content"><button type="button" class="close" onclick="fecharModalEditarAbastecimento()">&times;</button><h2>EDITAR ABASTECIMENTO</h2><input type="hidden" id="editAbastIndex"><div class="form-group"><label>DATA</label><input type="date" id="editDataAbastecimento"></div><div class="form-group"><label>VEÍCULO</label><select id="editSelectVeiculo"></select></div><div class="grid-2"><div class="form-group"><label>MOTORISTA</label><input type="text" id="editMotorista"></div><div class="form-group"><label>LITROS</label><input type="number" step="0.01" min="0" id="editLitros"></div></div><div class="grid-2"><div class="form-group"><label>VALOR TOTAL R$</label><input type="number" step="0.01" min="0" id="editValorTotal"></div><div class="form-group"><label>KM ATUAL</label><input type="number" min="0" id="editKmAtual"></div></div><div class="btn-group"><button type="button" class="btn btn-primary" onclick="salvarEdicaoAbastecimento()">SALVAR</button><button type="button" class="btn btn-secondary" onclick="fecharModalEditarAbastecimento()">CANCELAR</button></div></div></div>`);
}

function gerarHTMLPDF(dados, titulo) {
  const lista = [...dados].sort((a, b) => a[2] !== b[2] ? String(a[2]).localeCompare(String(b[2]), "pt-BR") : String(a[0]).localeCompare(String(b[0])));
  const totL = lista.reduce((s, x) => s + (Number(x[4]) || 0), 0), totV = lista.reduce((s, x) => s + (Number(x[5]) || 0), 0);
  let rows = "", ultV = "";
  lista.forEach(r => {
    if (ultV !== r[2]) { ultV = r[2]; rows += `<tr class="cabecalho-veiculo"><td colspan="8">VEÍCULO: ${escaparHTML(r[2])} — PLACA: ${escaparHTML(r[1])}</td></tr>`; }
    rows += `<tr><td>${escaparHTML(formatarData(r[0]))}</td><td><strong>${escaparHTML(r[1])}</strong></td><td>${escaparHTML(r[2])}</td><td>${escaparHTML(r[3] || "-")}</td><td>${Number(r[4]).toFixed(2)} L</td><td>R$ ${Number(r[5]).toFixed(2)}</td><td>${escaparHTML(formatarKmExibicao(r[6]))}</td><td>${r[7] !== "-" ? `${escaparHTML(r[7])} KM/L` : "-"}</td></tr>`;
  });
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escaparHTML(titulo)}</title><style>body{font-family:Arial,sans-serif;margin:30px;color:#2c3e50}h1{color:#1565c0;font-size:20px}.header{border-bottom:3px solid #1565c0;padding-bottom:15px;margin-bottom:20px}.cards{display:flex;gap:15px;margin-bottom:25px}.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:12px}.card span{display:block;font-size:10px;color:#666;text-transform:uppercase}.card strong{font-size:16px;color:#1565c0}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#1565c0;color:#fff;padding:9px}td{padding:8px;border-bottom:1px solid #eee;text-align:center}.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}@media print{@page{margin:1.5cm}body{margin:0}}</style></head><body><div class="header"><h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1><div>${escaparHTML(titulo)}</div><small>Emissão: ${(new Date).toLocaleString("pt-BR")}</small></div><div class="cards"><div class="card"><span>Total Registros</span><strong>${lista.length}</strong></div><div class="card"><span>Total Combustível</span><strong>${totL.toFixed(2)} L</strong></div><div class="card"><span>Investimento Total</span><strong>R$ ${totV.toFixed(2)}</strong></div></div><table><thead><tr><th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>CONSUMO</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`;
}

function gerarHTMLPDFManutencao(dados, titulo) {
  const lista = [...dados].sort((a, b) => a[2] !== b[2] ? String(a[2]).localeCompare(String(b[2]), "pt-BR") : String(a[0]).localeCompare(String(b[0])));
  let rows = "", ultV = "";
  lista.forEach(r => {
    if (ultV !== r[2]) { ultV = r[2]; rows += `<tr class="cabecalho-veiculo"><td colspan="6">VEÍCULO: ${escaparHTML(r[2])} — PLACA: ${escaparHTML(r[1])}</td></tr>`; }
    rows += `<tr><td>${escaparHTML(formatarData(r[0]))}</td><td><strong>${escaparHTML(r[1])}</strong></td><td>${escaparHTML(r[2])}</td><td>${escaparHTML(r[3] || "-")}</td><td>${r[4] ? escaparHTML(formatarKmExibicao(r[4])) : "-"}</td><td>${r[5] ? escaparHTML(formatarKmExibicao(r[5])) : "-"}</td></tr>`;
  });
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escaparHTML(titulo)}</title><style>body{font-family:Arial,sans-serif;margin:30px;color:#2c3e50}h1{color:#1565c0;font-size:20px}.header{border-bottom:3px solid #1565c0;padding-bottom:15px;margin-bottom:20px}.cards{display:flex;gap:15px;margin-bottom:25px}.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:12px}.card span{display:block;font-size:10px;color:#666;text-transform:uppercase}.card strong{font-size:16px;color:#1565c0}table{width:100%;border-collapse:collapse;font-size:11px}th{background:#1565c0;color:#fff;padding:9px}td{padding:8px;border-bottom:1px solid #eee;text-align:center}.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}@media print{@page{margin:1.5cm}body{margin:0}}</style></head><body><div class="header"><h1>AG4 FROTA — HISTÓRICO DE MANUTENÇÃO</h1><div>${escaparHTML(titulo)}</div><small>Emissão: ${(new Date).toLocaleString("pt-BR")}</small></div><div class="cards"><div class="card"><span>Total de Manutenções</span><strong>${lista.length}</strong></div></div><table><thead><tr><th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>TIPO SERVIÇO</th><th>KM ATUAL</th><th>PRÓX. TROCA</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`;
}

function abrirNovaAbaComPDF(html) {
  const win = window.open("", "_blank");
  if (!win) return alert("O navegador bloqueou a janela do PDF.");
  win.document.open(); win.document.write(html); win.document.close();
}

function gerarPDFGeral() {
  if (abaAtiva === "abastecimento") {
    DB.abastecimento.length ? abrirNovaAbaComPDF(gerarHTMLPDF(DB.abastecimento, "RELATÓRIO GERAL DE ABASTECIMENTO")) : alert("NÃO HÁ DADOS DE ABASTECIMENTO.");
  } else {
    DB.manutencao.length ? abrirNovaAbaComPDF(gerarHTMLPDFManutencao(DB.manutencao, "RELATÓRIO GERAL DE MANUTENÇÃO")) : alert("NÃO HÁ DADOS DE MANUTENÇÃO.");
  }
}

function abrirModalSeletiva() {
  const cont = document.getElementById("listaCheckboxesVeiculos"); cont.innerHTML = "";
  if (!listaVeiculosGlobal.length) return alert("NÃO HÁ VEÍCULOS CADASTRADOS.");
  [...listaVeiculosGlobal].sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")).forEach(v => {
    const item = document.createElement("div"); item.className = "checkbox-item";
    item.innerHTML = `<label><input type="checkbox" value="${escaparHTML(v.placa)}"> <span>${escaparHTML(v.nome)} - ${escaparHTML(v.placa)}</span></label>`;
    cont.appendChild(item);
  });
  const m = document.getElementById("modalSeletiva"); m.style.display = "block"; m.setAttribute("aria-hidden", "false");
}

function fecharModalSeletiva() { const m = document.getElementById("modalSeletiva"); m.style.display = "none"; m.setAttribute("aria-hidden", "true"); }

function gerarPDFSeletiva() {
  const sel = Array.from(document.querySelectorAll("#listaCheckboxesVeiculos input:checked")).map(el => el.value);
  if (!sel.length) return alert("SELECIONE PELO MENOS 1 VEÍCULO.");
  const nomes = listaVeiculosGlobal.filter(v => sel.includes(v.placa)).map(v => v.nome).join(", ");
  if (abaAtiva === "abastecimento") {
    const d = DB.abastecimento.filter(r => sel.includes(r[1]));
    d.length ? abrirNovaAbaComPDF(gerarHTMLPDF(d, `RELATÓRIO SELETIVO: ${nomes}`)) : alert("NENHUM ABASTECIMENTO ENCONTRADO.");
  } else {
    const d = DB.manutencao.filter(r => sel.includes(r[1]));
    d.length ? abrirNovaAbaComPDF(gerarHTMLPDFManutencao(d, `RELATÓRIO SELETIVO: ${nomes}`)) : alert("NENHUMA MANUTENÇÃO ENCONTRADA.");
  }
  fecharModalSeletiva();
}

window.addEventListener("click", e => { document.querySelectorAll(".modal").forEach(m => { if (e.target === m && m.id !== "telaLogin") { m.style.display = "none"; m.setAttribute("aria-hidden", "true"); } }); });
window.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach(m => { if (m.id !== "telaLogin") { m.style.display = "none"; m.setAttribute("aria-hidden", "true"); } }); });
