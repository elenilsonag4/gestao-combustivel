// ============================================================
// RELATÓRIOS PDF (COLUNAS APROXIMADAS)
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
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escaparHTML(titulo)}</title>
<style>
body{font-family:Arial,sans-serif;margin:20px;color:#2c3e50;background-color:#fff}
.pdf-container{max-width:900px;margin:0 auto}
h1{color:#1565c0;font-size:18px;margin-bottom:5px}
.header{border-bottom:2px solid #1565c0;padding-bottom:10px;margin-bottom:15px}
.cards{display:flex;gap:10px;margin-bottom:15px}
.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:8px 12px}
.card span{display:block;font-size:9px;color:#666;text-transform:uppercase}
.card strong{font-size:14px;color:#1565c0}
table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
th{background:#1565c0;color:#fff;padding:6px 8px;font-size:10px;text-transform:uppercase}
td{padding:5px 8px;border-bottom:1px solid #eee;text-align:center;word-wrap:break-word}

/* Larguras específicas para aproximar as colunas */
th:nth-child(1), td:nth-child(1) { width: 11%; } /* DATA */
th:nth-child(2), td:nth-child(2) { width: 11%; } /* PLACA */
th:nth-child(3), td:nth-child(3) { width: 22%; } /* VEÍCULO */
th:nth-child(4), td:nth-child(4) { width: 18%; } /* MOTORISTA */
th:nth-child(5), td:nth-child(5) { width: 10%; } /* LITROS */
th:nth-child(6), td:nth-child(6) { width: 10%; } /* VALOR */
th:nth-child(7), td:nth-child(7) { width: 9%;  } /* KM */
th:nth-child(8), td:nth-child(8) { width: 9%;  } /* CONSUMO */

.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}
@media print{@page{margin:1cm}body{margin:0}.pdf-container{max-width:100%}}
</style>
</head>
<body>
<div class="pdf-container">
  <div class="header">
    <h1>AG4 FROTA — GESTÃO DE COMBUSTÍVEL</h1>
    <div>${escaparHTML(titulo)}</div>
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
</div>
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
body{font-family:Arial,sans-serif;margin:20px;color:#2c3e50;background-color:#fff}
.pdf-container{max-width:900px;margin:0 auto}
h1{color:#1565c0;font-size:18px;margin-bottom:5px}
.header{border-bottom:2px solid #1565c0;padding-bottom:10px;margin-bottom:15px}
.cards{display:flex;gap:10px;margin-bottom:15px}
.card{flex:1;background:#f8f9fa;border:1px solid #ddd;border-left:4px solid #1565c0;padding:8px 12px}
.card span{display:block;font-size:9px;color:#666;text-transform:uppercase}
.card strong{font-size:14px;color:#1565c0}
table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}
th{background:#1565c0;color:#fff;padding:6px 8px;font-size:10px;text-transform:uppercase}
td{padding:5px 8px;border-bottom:1px solid #eee;text-align:center;word-wrap:break-word}

/* Larguras específicas para manutenção */
th:nth-child(1), td:nth-child(1) { width: 14%; } /* DATA/HORA */
th:nth-child(2), td:nth-child(2) { width: 10%; } /* PLACA */
th:nth-child(3), td:nth-child(3) { width: 18%; } /* VEÍCULO */
th:nth-child(4), td:nth-child(4) { width: 18%; } /* TIPO */
th:nth-child(5), td:nth-child(5) { width: 10%; } /* KM */
th:nth-child(6), td:nth-child(6) { width: 10%; } /* PRÓX. TROCA */
th:nth-child(7), td:nth-child(7) { width: 10%; } /* DATA ALARME */
th:nth-child(8), td:nth-child(8) { width: 10%; } /* OBSERVAÇÃO */

.cabecalho-veiculo td{background:#e3f2fd;font-weight:bold;color:#0d47a1;text-align:left}
@media print{@page{margin:1cm}body{margin:0}.pdf-container{max-width:100%}}
</style>
</head>
<body>
<div class="pdf-container">
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
</div>
</body>
</html>`;
}
