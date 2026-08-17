// ============================================================
// CONFIGURAÇÕES GERAIS E AUTENTICAÇÃO
// ============================================================

const API_URL = "https://script.google.com/macros/s/AKfycbw-pr-h9sOshx1qvI7B3G7CrIvZhfq1p3KYlXedW0gZJzsc0Gm7QVK9u4LmrecmaPnAwg/exec";

async function fazerLogin(event) {
  if (event) event.preventDefault(); // Impede o envio padrão do formulário e o reload da página[cite: 5, 6]

  const emailInput = document.getElementById("loginEmail").value.trim();
  const senhaInput = document.getElementById("loginSenha").value;
  const loginErro = document.getElementById("loginErro");
  const loadingSpinner = document.getElementById("loadingSpinner");

  if (loginErro) loginErro.style.display = "none";
  if (loadingSpinner) loadingSpinner.style.display = "flex";

  const payload = {
    acao: "fazerLogin",
    dados: {
      email: emailInput,
      senha: senhaInput
    }
  };

  try {
    // Configurações necessárias para evitar erro de CORS e redirecionamento no Google Apps Script
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      redirect: "follow",
      headers: { 
        "Content-Type": "text/plain;charset=utf-8" 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Erro de resposta na rede.");
    }

    const resultado = await response.json();

    if (resultado.ok) {
      document.getElementById("telaLogin").style.display = "none";
      document.getElementById("appContainer").style.display = "block";

      if (resultado.usuario && resultado.usuario.nome) {
        document.getElementById("nomeUsuarioLogado").innerText = resultado.usuario.nome;
      }

      localStorage.setItem("usuarioLogadoAG4", JSON.stringify(resultado.usuario));

      if (typeof sincronizarComNuvem === "function") {
        sincronizarComNuvem();
      }
    } else {
      if (loginErro) {
        loginErro.innerText = resultado.mensagem || "Credenciais inválidas.";
        loginErro.style.display = "block";
      }
    }
  } catch (erro) {
    console.error("Erro ao realizar login:", erro);
    if (loginErro) {
      loginErro.innerText = "Erro ao conectar com o servidor. Verifique a publicação do Apps Script.";
      loginErro.style.display = "block";
    }
  } finally {
    if (loadingSpinner) loadingSpinner.style.display = "none";
  }
}

function fazerLogout() {
  localStorage.removeItem("usuarioLogadoAG4");
  document.getElementById("telaLogin").style.display = "flex";
  document.getElementById("appContainer").style.display = "none";
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginSenha").value = "";
}

// ============================================================
// CONTROLE DE RELATÓRIOS (SISTEMA DE OVERLAY SEM RECARREGAR PÁGINA)
// ============================================================

function abrirNovaAbaComPDF(html) {
  let modalPDF = document.getElementById("overlayPDFModal");

  if (!modalPDF) {
    modalPDF = document.createElement("div");
    modalPDF.id = "overlayPDFModal";
    document.body.appendChild(modalPDF);
  }

  modalPDF.innerHTML = html;
  modalPDF.style.display = "block";

  // Permite fechar a visualização do relatório pelo botão 'Voltar' do navegador
  window.history.pushState({ pdfAberto: true }, "", "#relatorio");
}

function fecharRelatorioPDF() {
  const modalPDF = document.getElementById("overlayPDFModal");
  if (modalPDF) {
    modalPDF.style.display = "none";
  }
}

// Intercepta o botão de voltar do navegador mantendo a sessão ativa
window.addEventListener("popstate", function (event) {
  const modalPDF = document.getElementById("overlayPDFModal");
  if (modalPDF && modalPDF.style.display === "block") {
    modalPDF.style.display = "none";
  }
});

// ============================================================
// FUNÇÕES AUXILIARES DO SISTEMA
// ============================================================

function limparNumero(valor) {
  if (!valor) return 0;
  if (typeof valor === 'number') return valor;
  const textoLimpo = String(valor)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(textoLimpo) || 0;
}

function formatarData(dataStr) {
  if (!dataStr) return "-";
  if (dataStr.includes("T")) {
    dataStr = dataStr.split("T")[0];
  }
  const partes = dataStr.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dataStr;
}

function escaparHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// GERADORES DE TEMPLATE HTML PARA PDF / IMPRESSÃO
// ============================================================

function gerarHTMLPDF(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]), "pt-BR");
    return String(a[0]).localeCompare(String(a[0]));
  });

  const totalLitros = registros.reduce((sum, r) => sum + limparNumero(r[4]), 0);
  const totalValor = registros.reduce((sum, r) => sum + limparNumero(r[5]), 0);

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
        <td>${escaparHTML(r[4])} L</td>
        <td>R$ ${escaparHTML(r[5])}</td>
        <td>${escaparHTML(r[6])} KM</td>
        <td>${r[7] !== "-" ? `${escaparHTML(r[7])} KM/L` : "-"}</td>
      </tr>`;
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
</table>`;
}

function gerarHTMLPDFManutencao(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[3] !== b[3]) return String(a[3]).localeCompare(String(b[3]), "pt-BR");
    return String(a[0]).localeCompare(String(a[0]));
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
</table>`;
}
