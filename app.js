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
// RELATÓRIOS PDF (SISTEMA DE ABERTURA E IMPRESSÃO CORRIGIDOS)
// ============================================================

function abrirNovaAbaComPDF(html) {
  // Escreve o relatório diretamente na página atual para que
  // o histórico do navegador permaneça intacto e o botão "VOLTAR" funcione.
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
  body {
    font-family: Arial, sans-serif;
    margin: 30px auto;
    padding: 20px 40px;
    max-width: 1200px;
    color: #2c3e50;
    background-color: #ffffff;
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
    @page { size: A4 landscape; margin: 12mm 15mm; }
    body { margin: 0; padding: 0; max-width: 100%; }
  }
</style>
</head>
<body>
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
  body {
    font-family: Arial, sans-serif;
    margin: 30px auto;
    padding: 20px 40px;
    max-width: 1200px;
    color: #2c3e50;
    background-color: #ffffff;
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
    @page { size: A4 landscape; margin: 12mm 15mm; }
    body { margin: 0; padding: 0; max-width: 100%; }
  }
</style>
</head>
<body>
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
