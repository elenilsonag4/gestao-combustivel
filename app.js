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

// Escuta a ação de voltar do navegador e recarrega o sistema principal
window.addEventListener("popstate", function (event) {
  window.location.reload();
});

// ============================================================
// RELATÓRIOS PDF (ABERTURA NA MESMA ABA E MARGENS DE 18%)
// ============================================================

function abrirNovaAbaComPDF(html) {
  // Salva o estado atual para que a seta "VOLTAR" do navegador saiba onde retornar
  window.history.pushState({ page: "pdf" }, "", window.location.href);

  // Substitui o conteúdo da própria aba ativa
  document.open();
  document.write(html);
  document.close();
}

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
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHTML(titulo)}</title>
<style>
  html {
    background-color: #f4f6f9;
  }
  body {
    font-family: Arial, sans-serif;
    margin: 0 auto;
    padding: 30px 18%; /* Margens de 18% em cada lado na tela */
    box-sizing: border-box;
    color: #2c3e50;
    background-color: #ffffff;
    min-height: 100vh;
  }
  .btn-voltar {
    display: inline-block;
    margin-bottom: 20px;
    padding: 8px 16px;
    background-color: #1565c0;
    color: #ffffff;
    text-decoration: none;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
  }
  .btn-voltar:hover {
    background-color: #0d47a1;
  }
  h1 { color: #1565c0; font-size: 20px; margin: 0 0 5px 0; }
  .header { border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
  .cards { display: flex; gap: 15px; margin-bottom: 25px; }
  .card { flex: 1; background: #f8f9fa; border: 1px solid #ddd; border-left: 4px solid #1565c0; padding: 12px; }
  .card span { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
  .card strong { font-size: 16px; color: #1565c0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1565c0; color: #fff; padding: 9px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #eee; text-align: center; }
  .cabecalho-veiculo td { background: #e3f2fd; font-weight: bold; color: #0d47a1; text-align: left; }
  
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    html { background-color: #ffffff; }
    body { padding: 0; margin: 0; width: 100%; }
    .btn-voltar { display: none !important; }
  }
</style>
</head>
<body>
<button class="btn-voltar" onclick="window.history.back()">← Voltar ao Sistema</button>
<div class="header">
  <h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1>
  <div><strong>${escaparHTML(titulo)}</strong></div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards">
  <div class="card"><span>Total Registros</span><strong>${registros.length}</strong></div>
  <div class="card"><span>Total Combustível</span><strong>${totalLitros.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} L</strong></div>
  <div class="card"><span>Investimento Total</span><strong>R$ ${totalValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
</div>
<table>
<thead><tr><th>DATA</th><th>PLACA</th><th>VEÍCULO</th><th>MOTORISTA</th><th>LITROS</th><th>VALOR</th><th>KM</th><th>CONSUMO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>
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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHTML(titulo)}</title>
<style>
  html {
    background-color: #f4f6f9;
  }
  body {
    font-family: Arial, sans-serif;
    margin: 0 auto;
    padding: 30px 18%; /* Margens de 18% em cada lado na tela */
    box-sizing: border-box;
    color: #2c3e50;
    background-color: #ffffff;
    min-height: 100vh;
  }
  .btn-voltar {
    display: inline-block;
    margin-bottom: 20px;
    padding: 8px 16px;
    background-color: #1565c0;
    color: #ffffff;
    text-decoration: none;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    text-transform: uppercase;
  }
  .btn-voltar:hover {
    background-color: #0d47a1;
  }
  h1 { color: #1565c0; font-size: 20px; margin: 0 0 5px 0; }
  .header { border-bottom: 3px solid #1565c0; padding-bottom: 15px; margin-bottom: 20px; }
  .cards { display: flex; gap: 15px; margin-bottom: 25px; }
  .card { flex: 1; background: #f8f9fa; border: 1px solid #ddd; border-left: 4px solid #1565c0; padding: 12px; }
  .card span { display: block; font-size: 10px; color: #666; text-transform: uppercase; }
  .card strong { font-size: 16px; color: #1565c0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1565c0; color: #fff; padding: 9px; text-transform: uppercase; }
  td { padding: 8px; border-bottom: 1px solid #eee; text-align: center; }
  .cabecalho-veiculo td { background: #e3f2fd; font-weight: bold; color: #0d47a1; text-align: left; }
  
  @media print {
    @page { size: A4 landscape; margin: 10mm; }
    html { background-color: #ffffff; }
    body { padding: 0; margin: 0; width: 100%; }
    .btn-voltar { display: none !important; }
  }
</style>
</head>
<body>
<button class="btn-voltar" onclick="window.history.back()">← Voltar ao Sistema</button>
<div class="header">
  <h1>AG4 FROTA — HISTÓRICO DE MANUTENÇÃO</h1>
  <div><strong>${escaparHTML(titulo)}</strong></div>
  <small>Emissão: ${new Date().toLocaleString("pt-BR")}</small>
</div>
<div class="cards">
  <div class="card"><span>Total de Manutenções</span><strong>${registros.length}</strong></div>
</div>
<table>
<thead><tr><th>DATA/HORA REGISTRO</th><th>PLACA</th><th>VEÍCULO</th><th>TIPO SERVIÇO</th><th>KM</th><th>PRÓXIMA TROCA</th><th>DATA ALARME</th><th>OBSERVAÇÃO</th></tr></thead>
<tbody>${linhas}</tbody>
</table>
</body>
</html>`;
}
