// ============================================================
// CONFIGURAÇÕES GERAIS E AUTENTICAÇÃO
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbw-pr-h9sOshx1qvI7B3G7CrIvZhfq1p3KYlXedW0gZJzsc0Gm7QVK9u4LmrecmaPnAwg/exec";

async function fazerLogin(event) {
  if (event) event.preventDefault(); // Impede o envio padrão do formulário e o reload da página[cite: 5, 6]

  const emailInput = document.getElementById("loginEmail").value; //[cite: 6]
  const senhaInput = document.getElementById("loginSenha").value; //[cite: 6]
  const loginErro = document.getElementById("loginErro"); //[cite: 6]
  const loadingSpinner = document.getElementById("loadingSpinner"); //[cite: 6]

  if (loginErro) loginErro.style.display = "none"; //[cite: 6]
  if (loadingSpinner) loadingSpinner.style.display = "flex"; //[cite: 6]

  const payload = {
    acao: "fazerLogin",
    dados: {
      email: emailInput,
      senha: senhaInput
    }
  }; //[cite: 6]

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }); //[cite: 6]

    const resultado = await response.json(); //[cite: 6]

    if (resultado.ok) {
      document.getElementById("telaLogin").style.display = "none"; //[cite: 6]
      document.getElementById("appContainer").style.display = "block"; //[cite: 6]

      if (resultado.usuario && resultado.usuario.nome) {
        document.getElementById("nomeUsuarioLogado").innerText = resultado.usuario.nome; //[cite: 6]
      }

      localStorage.setItem("usuarioLogadoAG4", JSON.stringify(resultado.usuario)); //[cite: 6]

      if (typeof sincronizarComNuvem === "function") {
        sincronizarComNuvem(); //[cite: 6]
      }
    } else {
      if (loginErro) {
        loginErro.innerText = resultado.mensagem || "Credenciais inválidas."; //[cite: 6]
        loginErro.style.display = "block"; //[cite: 6]
      }
    }
  } catch (erro) {
    console.error("Erro ao realizar login:", erro); //[cite: 6]
    if (loginErro) {
      loginErro.innerText = "Erro ao conectar com o servidor."; //[cite: 6]
      loginErro.style.display = "block"; //[cite: 6]
    }
  } finally {
    if (loadingSpinner) loadingSpinner.style.display = "none"; //[cite: 6]
  }
}

function fazerLogout() {
  localStorage.removeItem("usuarioLogadoAG4"); //[cite: 6]
  document.getElementById("telaLogin").style.display = "flex"; //[cite: 6]
  document.getElementById("appContainer").style.display = "none"; //[cite: 6]
  document.getElementById("loginEmail").value = ""; //[cite: 6]
  document.getElementById("loginSenha").value = ""; //[cite: 6]
}

// ============================================================
// CONTROLE DE RELATÓRIOS (SISTEMA DE OVERLAY SEM RECARREGAR PÁGINA)
// ============================================================

function abrirNovaAbaComPDF(html) {
  let modalPDF = document.getElementById("overlayPDFModal"); //[cite: 6]

  if (!modalPDF) {
    modalPDF = document.createElement("div"); //[cite: 6]
    modalPDF.id = "overlayPDFModal"; //[cite: 6]
    document.body.appendChild(modalPDF); //[cite: 6]
  }

  modalPDF.innerHTML = html; //[cite: 6]
  modalPDF.style.display = "block"; //[cite: 6]

  // Permite fechar a visualização do relatório pelo botão 'Voltar' do navegador
  window.history.pushState({ pdfAberto: true }, "", "#relatorio"); //[cite: 6]
}

function fecharRelatorioPDF() {
  const modalPDF = document.getElementById("overlayPDFModal"); //[cite: 6]
  if (modalPDF) {
    modalPDF.style.display = "none"; //[cite: 6]
  }
}

// Intercepta o botão de voltar do navegador mantendo a sessão ativa
window.addEventListener("popstate", function (event) {
  const modalPDF = document.getElementById("overlayPDFModal"); //[cite: 6]
  if (modalPDF && modalPDF.style.display === "block") {
    modalPDF.style.display = "none"; //[cite: 6]
  }
}); //[cite: 6]

// ============================================================
// FUNÇÕES AUXILIARES DO SISTEMA
// ============================================================

function limparNumero(valor) {
  if (!valor) return 0; //[cite: 6]
  if (typeof valor === 'number') return valor; //[cite: 6]
  const textoLimpo = String(valor)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.'); //[cite: 6]
  return parseFloat(textoLimpo) || 0; //[cite: 6]
}

function formatarData(dataStr) {
  if (!dataStr) return "-"; //[cite: 6]
  if (dataStr.includes("T")) {
    dataStr = dataStr.split("T")[0]; //[cite: 6]
  }
  const partes = dataStr.split("-"); //[cite: 6]
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`; //[cite: 6]
  }
  return dataStr; //[cite: 6]
}

function escaparHTML(str) {
  if (str === null || str === undefined) return ""; //[cite: 6]
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;"); //[cite: 6]
}

// ============================================================
// GERADORES DE TEMPLATE HTML PARA PDF / IMPRESSÃO
// ============================================================

function gerarHTMLPDF(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]), "pt-BR"); //[cite: 6]
    return String(a[0]).localeCompare(String(a[0])); //[cite: 6]
  }); //[cite: 6]

  const totalLitros = registros.reduce((sum, r) => sum + limparNumero(r[4]), 0); //[cite: 6]
  const totalValor = registros.reduce((sum, r) => sum + limparNumero(r[5]), 0); //[cite: 6]

  let linhas = ""; //[cite: 6]
  let veiculoAtual = ""; //[cite: 6]

  registros.forEach(r => {
    if (veiculoAtual !== r[2]) {
      veiculoAtual = r[2]; //[cite: 6]
      linhas += `<tr class="cabecalho-veiculo"><td colspan="8">VEÍCULO: ${escaparHTML(r[2])} — PLACA: ${escaparHTML(r[1])}</td></tr>`; //[cite: 6]
    }
    linhas += `
      <tr>
        <td>${escaparHTML(formatarData(r[0]))}</td>
        <td><strong>${escaparHTML(r[1])}</strong></td>
        <td>${escaparHTML(r[2])}</td>
        <td>${escaparHTML(r[3] || "-")}</td>
        <td>${escaparHTML(r[4])} L</td>
        <td>R$ ${escaparHTML(r[5])}</td>
        <td>${escaparHTML(r[6])} KM</td>
        <td>${r[7] !== "-" ? `${escaparHTML(r[7])} KM/L` : "-"}</td>
      </tr>`; //[cite: 6]
  });

  return `
<style>
  #overlayPDFModal {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: #ffffff;
    z-index: 99999;
    overflow-y: auto;
    padding: 30px 18% !important;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    color: #2c3e50;
  }
  .btn-voltar-pdf {
    display: inline-block;
    margin-bottom: 20px;
    padding: 8px 16px;
    background-color: #1565c0;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
  }
  .btn-voltar-pdf:hover { background-color: #0d47a1; }
  h1 { color: #1565c0; font-size: 20px; margin: 0 0 5px 0; }
  .header-pdf { border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
  .cards-pdf { display: flex; gap: 15px; margin-bottom: 25px; }
  .card-pdf { flex: 1; background: #f8f9fa; border: 1px solid #ddd; border-left: 4px solid #1565c0; padding: 12px; }
  .card-pdf span { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
  .card-pdf strong { font-size: 16px; color: #1565c0; }
  .tabela-pdf { width: 100%; border-collapse: collapse; font-size: 11px; }
  .tabela-pdf th { background: #1565c0; color: #fff; padding: 9px; text-transform: uppercase; }
  .tabela-pdf td { padding: 8px; border-bottom: 1px solid #eee; text-align: center; }
  .cabecalho-veiculo td { background: #e3f2fd; font-weight: bold; color: #0d47a1; text-align: left; }
  
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    #overlayPDFModal { padding: 0 !important; position: static; overflow: visible; }
    .btn-voltar-pdf { display: none !important; }
  }
</style>

<button class="btn-voltar-pdf" onclick="fecharRelatorioPDF()">← Voltar ao Sistema</button>
<div class="header-pdf">
  <h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1>
  <div><strong>${escaparHTML(titulo)}</strong></div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards-pdf">
  <div class="card-pdf"><span>Total Registros</span><strong>${registros.length}</strong></div>
  <div class="card-pdf"><span>Total Combustível</span><strong>${totalLitros.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} L</strong></div>
  <div class="card-pdf"><span>Investimento Total</span><strong>R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
</div>
<table class="tabela-pdf">
<thead><tr><th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>CONSUMO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>`; //[cite: 6]
}

function gerarHTMLPDFManutencao(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[3] !== b[3]) return String(a[3]).localeCompare(String(b[3]), "pt-BR"); //[cite: 6]
    return String(a[0]).localeCompare(String(a[0])); //[cite: 6]
  }); //[cite: 6]

  let linhas = ""; //[cite: 6]
  let veiculoAtual = ""; //[cite: 6]

  registros.forEach(r => {
    if (veiculoAtual !== r[3]) {
      veiculoAtual = r[3]; //[cite: 6]
      linhas += `<tr class="cabecalho-veiculo"><td colspan="8">VEÍCULO: ${escaparHTML(r[3])} — PLACA: ${escaparHTML(r[2])}</td></tr>`; //[cite: 6]
    }
    const dataHora = `${formatarData(r[0])} ${r[1] || ''}`.trim(); //[cite: 6]
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
      </tr>`; //[cite: 6]
  });

  return `
<style>
  #overlayPDFModal {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background-color: #ffffff;
    z-index: 99999;
    overflow-y: auto;
    padding: 30px 18% !important;
    box-sizing: border-box;
    font-family: Arial, sans-serif;
    color: #2c3e50;
  }
  .btn-voltar-pdf {
    display: inline-block;
    margin-bottom: 20px;
    padding: 8px 16px;
    background-color: #1565c0;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
  }
  .btn-voltar-pdf:hover { background-color: #0d47a1; }
  h1 { color: #1565c0; font-size: 20px; margin: 0 0 5px 0; }
  .header-pdf { border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
  .cards-pdf { display: flex; gap: 15px; margin-bottom: 25px; }
  .card-pdf { flex: 1; background: #f8f9fa; border: 1px solid #ddd; border-left: 4px solid #1565c0; padding: 12px; }
  .card-pdf span { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
  .card-pdf strong { font-size: 16px; color: #1565c0; }
  .tabela-pdf { width: 100%; border-collapse: collapse; font-size: 11px; }
  .tabela-pdf th { background: #1565c0; color: #fff; padding: 9px; text-transform: uppercase; }
  .tabela-pdf td { padding: 8px; border-bottom: 1px solid #eee; text-align: center; }
  .cabecalho-veiculo td { background: #e3f2fd; font-weight: bold; color: #0d47a1; text-align: left; }
  
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    #overlayPDFModal { padding: 0 !important; position: static; overflow: visible; }
    .btn-voltar-pdf { display: none !important; }
  }
</style>

<button class="btn-voltar-pdf" onclick="fecharRelatorioPDF()">← Voltar ao Sistema</button>
<div class="header-pdf">
  <h1>AG4 FROTA — HISTÓRICO DE MANUTENÇÃO</h1>
  <div><strong>${escaparHTML(titulo)}</strong></div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards-pdf">
  <div class="card-pdf"><span>Total de Manutenções</span><strong>${registros.length}</strong></div>
</div>
<table class="tabela-pdf">
<thead><tr><th>DATA/HORA REGISTRO</th><th>PLACA</th><th>VEÍCULO</th><th>TIPO SERVIÇO</th><th>KM</th><th>PRÓXIMA TROCA</th><th>DATA ALARME</th><th>OBSERVAÇÃO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>`; //[cite: 6]
}
