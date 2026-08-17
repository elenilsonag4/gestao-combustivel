// ============================================================
// CONTROLE DE NAVEGAÇÃO ENTRE RELATÓRIO E SISTEMA (SEM PERDER LOGIN)
// ============================================================

// Escuta a ação de voltar do navegador e restaura a visão da aplicação
window.addEventListener("popstate", function (event) {
  const containerRelatorio = document.getElementById("containerRelatorioPDF");
  const appContainer = document.getElementById("appContainer");

  if (containerRelatorio) {
    containerRelatorio.style.display = "none";
  }
  if (appContainer) {
    appContainer.style.display = "block";
  }
});

function abrirNovaAbaComPDF(html) {
  let containerRelatorio = document.getElementById("containerRelatorioPDF");

  // Cria um container dinâmico para o relatório se ele não existir
  if (!containerRelatorio) {
    containerRelatorio = document.createElement("div");
    containerRelatorio.id = "containerRelatorioPDF";
    document.body.appendChild(containerRelatorio);
  }

  // Insere o HTML do relatório no container
  containerRelatorio.innerHTML = html;

  // Oculta o app principal e exibe o relatório na mesma aba
  document.getElementById("appContainer").style.display = "none";
  containerRelatorio.style.display = "block";

  // Adiciona o estado ao histórico para que o botão VOLTAR funcione
  window.history.pushState({ page: "relatorio" }, "", "#relatorio");
  window.scrollTo(0, 0);
}

function fecharRelatorioPDF() {
  window.history.back();
}

// ============================================================
// GERADORES DE RELATÓRIO COM MARGENS DE 18% NAS LATERAIS
// ============================================================

function gerarHTMLPDF(dados, titulo) {
  const registros = [...dados].sort((a, b) => {
    if (a[2] !== b[2]) return String(a[2]).localeCompare(String(b[2]), "pt-BR");
    return String(a[0]).localeCompare(String(b[0]));
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
  #containerRelatorioPDF {
    font-family: Arial, sans-serif;
    padding: 30px 18% !important; /* Margem lateral fixa de 18% */
    box-sizing: border-box;
    color: #2c3e50;
    background-color: #ffffff;
    min-height: 100vh;
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
    #containerRelatorioPDF { padding: 0 !important; }
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
<style>
  #containerRelatorioPDF {
    font-family: Arial, sans-serif;
    padding: 30px 18% !important; /* Margem lateral fixa de 18% */
    box-sizing: border-box;
    color: #2c3e50;
    background-color: #ffffff;
    min-height: 100vh;
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
    #containerRelatorioPDF { padding: 0 !important; }
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
