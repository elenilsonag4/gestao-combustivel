// ============================================================
// AG4 FROTA - GOOGLE APPS SCRIPT (CORRIGIDO 10 COLUNAS)
// ============================================================

const ID_PLANILHA = "1dB54DZG1kwMFQT0DTIhaIBI3EDL2zlSyvo6_T-guhxY";

function respostaJSON(ok, mensagem, extra) {
  const resultado = Object.assign({ ok: ok, mensagem: mensagem }, extra || {});
  return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return respostaJSON(true, "Web App AG4 FROTA ativo.");
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    let requisicao;
    try {
      if (e && e.parameter && e.parameter.payload) {
        requisicao = JSON.parse(e.parameter.payload);
      } else if (e && e.postData && e.postData.contents) {
        requisicao = JSON.parse(e.postData.contents);
      } else {
        return respostaJSON(false, "Nenhum dado recebido no corpo da requisição.");
      }
    } catch (erroJSON) {
      return respostaJSON(false, "JSON inválido: " + erroJSON.message);
    }

    const acao = requisicao.acao;
    const dados = requisicao.dados;
    if (!acao) return respostaJSON(false, "Ação não informada.");
    const ss = SpreadsheetApp.openById(ID_PLANILHA);

    // --------------------------------------------------------
    // LOGIN
    // --------------------------------------------------------
    if (acao === "fazerLogin") {
      let sheetUsuarios;
      try {
        sheetUsuarios = obterAba(ss, "Usuarios");
      } catch (err) {
        sheetUsuarios = ss.insertSheet("Usuarios");
        sheetUsuarios.appendRow(["NOME", "EMAIL", "SENHA"]);
        sheetUsuarios.appendRow(["ADMINISTRADOR", "ADMIN@AG4.COM", "123456"]);
      }
      const email = String(dados && dados.email || "").toLowerCase().trim();
      const senha = String(dados && dados.senha || "").trim();
      const ultimaLinha = sheetUsuarios.getLastRow();
      if (ultimaLinha < 2) return respostaJSON(false, "Nenhum usuário cadastrado.");
      const valores = sheetUsuarios.getRange(2, 1, ultimaLinha - 1, 3).getValues();
      const usuario = valores.find(row => String(row[1]).toLowerCase().trim() === email && String(row[2]).trim() === senha);
      if (usuario) {
        return respostaJSON(true, "Login realizado com sucesso!", { usuario: { nome: usuario[0], email: usuario[1] } });
      } else {
        return respostaJSON(false, "E-mail ou senha incorretos.");
      }
    }

    // --------------------------------------------------------
    // OBTER DADOS - AGORA LÊ 10 COLUNAS
    // --------------------------------------------------------
    if (acao === "obterDados") {
      let veiculos = [];
      let abastecimento = [];
      let manutencao = [];
      try {
        const sheetVeiculos = obterAba(ss, "Veículos");
        if (sheetVeiculos.getLastRow() > 1) {
          veiculos = sheetVeiculos.getRange(2, 1, sheetVeiculos.getLastRow() - 1, 2).getValues()
           .map(r => ({ nome: String(r[0]), placa: String(r[1]) }))
           .filter(v => v.nome && v.placa);
        }
      } catch (_) {}

      try {
        const sheetCombustivel = obterAba(ss, "Combustível");
        if (sheetCombustivel.getLastRow() > 1) {
          abastecimento = sheetCombustivel.getRange(2, 1, sheetCombustivel.getLastRow() - 1, 8).getValues()
           .map(r => [
              normalizarDataParaInput(r[0]),
              String(r[1] || ""),
              String(r[2] || ""),
              String(r[3] || ""),
              r[4]!== ""? String(r[4]).replace(".", ",") : "",
              r[5]!== ""? String(r[5]).replace(".", ",") : "",
              r[6]!== ""? String(r[6]) : "",
              String(r[7] || "-")
            ]);
        }
      } catch (_) {}

      try {
        const sheetManutencao = obterAba(ss, "Manutenção");
        if (sheetManutencao.getLastRow() > 1) {
          const lastCol = Math.min(10, sheetManutencao.getLastColumn());
          manutencao = sheetManutencao.getRange(2, 1, sheetManutencao.getLastRow() - 1, lastCol).getValues()
           .map(r => [
              normalizarDataParaInput(r[0]),
              normalizarHoraParaInput(r[1]),
              String(r[2] || ""),
              String(r[3] || ""),
              String(r[4] || ""),
              r[5]!== ""? Number(r[5]) : "",
              r[6]!== ""? Number(r[6]) : "",
              normalizarDataParaInput(r[7]),
              String(r[8] || ""),
              String(r[9] || "KM") // COLUNA 10 - UNIDADE
            ]);
        }
      } catch (_) {}

      return respostaJSON(true, "Dados obtidos com sucesso.", { DB: { veiculos, abastecimento, manutencao } });
    }

    // --------------------------------------------------------
    // ABASTECIMENTO
    // --------------------------------------------------------
    if (acao === "registrarAbastecimento" || acao === "salvarCombustivel") {
      const sheet = obterAba(ss, "Combustível");
      sheet.appendRow(normalizarLinhaAbastecimento(dados));
      return respostaJSON(true, "Abastecimento registrado na planilha.");
    }

    if (acao === "editarAbastecimento") {
      const sheet = obterAba(ss, "Combustível");
      const antigo = dados && dados.antigo;
      const novo = dados && dados.novo;
      if (!antigo ||!novo) return respostaJSON(false, "Dados insuficientes.");
      let linhaEncontrada = encontrarLinhaPorCamposChave(sheet, antigo, [0, 1, 6]);
      if (linhaEncontrada === -1) linhaEncontrada = encontrarLinhaPorCamposChave(sheet, antigo, [0, 1]);
      if (linhaEncontrada === -1) return respostaJSON(false, "Abastecimento não localizado.");
      sheet.getRange(linhaEncontrada, 1, 1, 8).setValues([normalizarLinhaAbastecimento(novo)]);
      return respostaJSON(true, "Abastecimento alterado.");
    }

    if (acao === "excluirAbastecimento") {
      const sheet = obterAba(ss, "Combustível");
      const item = dados && dados.item;
      let linhaEncontrada = encontrarLinhaPorCamposChave(sheet, item, [0, 1, 6]);
      if (linhaEncontrada === -1) linhaEncontrada = encontrarLinhaPorCamposChave(sheet, item, [0, 1]);
      if (linhaEncontrada === -1) return respostaJSON(false, "Abastecimento não localizado.");
      sheet.deleteRow(linhaEncontrada);
      return respostaJSON(true, "Abastecimento removido.");
    }

    // --------------------------------------------------------
    // MANUTENÇÃO - AGORA 10 COLUNAS
    // --------------------------------------------------------
    if (acao === "registrarManutencao" || acao === "salvarManutencao") {
      const sheet = obterAba(ss, "Manutenção");
      // Garante cabeçalho com 10 colunas se for primeira vez
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["DATA","HORA","PLACA","VEÍCULO","TIPO","KM_ATUAL","PROXIMA_TROCA","DATA_ALARME","OBS_ALARME","UNIDADE"]);
      } else if (sheet.getLastColumn() < 10) {
        sheet.getRange(1, 10).setValue("UNIDADE");
      }
      sheet.appendRow(normalizarLinhaManutencao(dados));
      return respostaJSON(true, "Manutenção registrada.");
    }

    if (acao === "editarManutencao") {
      const sheet = obterAba(ss, "Manutenção");
      const antigo = dados && dados.antigo;
      const novo = dados && dados.novo;
      if (!antigo ||!novo) return respostaJSON(false, "Dados insuficientes.");
      let linhaEncontrada = encontrarLinhaFlexivel(sheet, antigo, [2, 4, 5]);
      if (linhaEncontrada === -1) return respostaJSON(false, "Manutenção não localizada.");
      sheet.getRange(linhaEncontrada, 1, 1, 10).setValues([normalizarLinhaManutencao(novo)]);
      return respostaJSON(true, "Manutenção alterada.");
    }

    if (acao === "excluirManutencao") {
      const sheet = obterAba(ss, "Manutenção");
      const item = dados && dados.item;
      let linhaEncontrada = encontrarLinhaPorCamposChave(sheet, item, [0, 2, 4]);
      if (linhaEncontrada === -1) linhaEncontrada = encontrarLinhaPorCamposChave(sheet, item, [0, 2]);
      if (linhaEncontrada === -1) return respostaJSON(false, "Manutenção não localizada.");
      sheet.deleteRow(linhaEncontrada);
      return respostaJSON(true, "Manutenção removida.");
    }

    // --------------------------------------------------------
    // VEÍCULOS
    // --------------------------------------------------------
    if (acao === "cadastrarVeiculo") {
      const sheet = obterAba(ss, "Veículos");
      const nome = String(dados && dados.nome || "").trim().toUpperCase();
      const placa = String(dados && dados.placa || "").trim().toUpperCase();
      if (!nome ||!placa) return respostaJSON(false, "Nome e placa são obrigatórios.");
      if (encontrarLinhaPorValor(sheet, 2, placa)!== -1) return respostaJSON(false, "Placa já existente.");
      sheet.appendRow([nome, placa]);
      return respostaJSON(true, "Veículo cadastrado.");
    }

    if (acao === "editarVeiculo") {
      const placaAntiga = String(dados && dados.placaAntiga || "").trim().toUpperCase();
      const nomeNovo = String(dados && dados.nomeNovo || "").trim().toUpperCase();
      const placaNova = String(dados && dados.placaNova || "").trim().toUpperCase();
      if (!placaAntiga ||!nomeNovo ||!placaNova) return respostaJSON(false, "Dados insuficientes.");
      atualizarVeiculoNaAba(ss, "Veículos", placaAntiga, nomeNovo, placaNova);
      atualizarHistoricoVeiculo(ss, "Combustível", placaAntiga, nomeNovo, placaNova, 2, 3);
      atualizarHistoricoVeiculo(ss, "Manutenção", placaAntiga, nomeNovo, placaNova, 3, 4);
      return respostaJSON(true, "Veículo atualizado.");
    }

    if (acao === "excluirVeiculo") {
      const placa = String(typeof dados === "string"? dados : (dados && dados.placa || "")).trim().toUpperCase();
      if (!placa) return respostaJSON(false, "Placa não informada.");
      excluirDaAba(ss, "Veículos", 2, placa);
      excluirDaAba(ss, "Combustível", 2, placa);
      excluirDaAba(ss, "Manutenção", 3, placa);
      return respostaJSON(true, "Veículo excluído.");
    }

    return respostaJSON(false, "Ação não reconhecida: " + acao);

  } catch (erro) {
    console.error(erro);
    return respostaJSON(false, "Erro no servidor: " + erro.toString());
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================
function obterAba(ss, nome) {
  const sheet = ss.getSheetByName(nome);
  if (!sheet) throw new Error("Aba '" + nome + "' não encontrada.");
  return sheet;
}

function normalizarDataParaInput(valor) {
  if (!valor) return "";
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  let texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const p = texto.split("/");
    return `${p[2]}-${p[1]}-${p[0]}`;
  }
  try {
    const d = new Date(texto);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
  } catch (_) {}
  return texto;
}

function normalizarHoraParaInput(valor) {
  if (!valor) return "";
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), "HH:mm");
  return String(valor).trim();
}

function normalizarLinhaAbastecimento(dados) {
  if (Array.isArray(dados)) {
    return [
      normalizarDataParaInput(dados[0]), dados[1]||"", dados[2]||"", dados[3]||"",
      dados[4]||"", dados[5]||"", dados[6]||"", dados[7]||"-"
    ];
  }
  return [
    normalizarDataParaInput(dados.dataAbastecimento||dados.data),
    dados.placa||"", dados.nome||dados.veiculo||"", dados.motorista||"",
    dados.litros||"", dados.valorTotal||dados.valor||"", dados.kmAtual||dados.km||"", dados.consumo||"-"
  ];
}

function normalizarLinhaManutencao(dados) {
  if (Array.isArray(dados)) {
    return [
      normalizarDataParaInput(dados[0]),
      dados[1]||"",
      dados[2]||"",
      dados[3]||"",
      dados[4]||"",
      dados[5]!==""?dados[5]:"",
      dados[6]!==""?dados[6]:"",
      normalizarDataParaInput(dados[7]),
      dados[8]||"",
      dados[9]||"KM" // NOVA COLUNA
    ];
  }
  return [
    normalizarDataParaInput(dados.data),
    dados.hora||"",
    dados.placa||"",
    dados.nome||dados.veiculo||"",
    dados.tipo||"",
    dados.km!==""?dados.km:"",
    dados.proximaTroca!==""?dados.proximaTroca:"",
    normalizarDataParaInput(dados.dataAlarme||dados.alarme),
    dados.obsAlarme||dados.observacao||"",
    dados.unidade||"KM"
  ];
}

function normalizarComparacao(valor) {
  if (valor===null||valor===undefined) return "";
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), "yyyy-MM-dd");
  if (typeof valor==="number") return String(valor).trim();
  let texto = String(valor).trim().toUpperCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const p = texto.split("/"); return `${p[2]}-${p[1]}-${p[0]}`;
  }
  if (texto.includes("-")||texto.includes("/")) {
    try {
      const d = new Date(texto);
      if (!isNaN(d.getTime())) return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch (_) {}
  }
  return texto;
}

function obterValorDoObjetoOuArray(dado, idx) {
  if (!dado) return "";
  if (Array.isArray(dado)) return dado[idx]!==undefined?dado[idx]:"";
  if (typeof dado==="object") {
    const map = {0:dado.dataAbastecimento||dado.data,1:dado.placa,2:dado.nome||dado.veiculo,3:dado.motorista,4:dado.litros,5:dado.valorTotal||dado.valor,6:dado.kmAtual||dado.km,7:dado.consumo};
    if (map[idx]!==undefined) return map[idx];
    return dado[idx]!==undefined?dado[idx]:"";
  }
  return "";
}

function encontrarLinhaPorCamposChave(sheet, item, indicesChave) {
  if (!item) return -1;
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return -1;
  const valores = sheet.getRange(2,1,ultimaLinha-1,sheet.getLastColumn()).getValues();
  for (let i=valores.length-1;i>=0;i--) {
    const linha = valores[i];
    let bateu=true;
    for (let k=0;k<indicesChave.length;k++) {
      const idx=indicesChave[k];
      if (normalizarComparacao(linha[idx])!==normalizarComparacao(obterValorDoObjetoOuArray(item,idx))) {bateu=false;break;}
    }
    if (bateu) return i+2;
  }
  return -1;
}

function encontrarLinhaFlexivel(sheet, item, indicesChave) {
  if (!item) return -1;
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha<2) return -1;
  const valores = sheet.getRange(2,1,ultimaLinha-1,sheet.getLastColumn()).getValues();
  for (let i=valores.length-1;i>=0;i--) {
    const linha=valores[i];
    let bateuTodos=true;
    for (let k=0;k<indicesChave.length;k++) {
      const idx=indicesChave[k];
      if (normalizarComparacao(linha[idx])!==normalizarComparacao(obterValorDoObjetoOuArray(item,idx))) {bateuTodos=false;break;}
    }
    if (bateuTodos) return i+2;
  }
  for (let i=valores.length-1;i>=0;i--) {
    const linha=valores[i];
    const idxPlaca=indicesChave[0], idxData=indicesChave[1];
    if (normalizarComparacao(linha[idxPlaca])===normalizarComparacao(obterValorDoObjetoOuArray(item,idxPlaca)) &&
        normalizarComparacao(linha[idxData])===normalizarComparacao(obterValorDoObjetoOuArray(item,idxData))) return i+2;
  }
  return -1;
}

function encontrarLinhaPorValor(sheet,coluna,valor){
  const ultimaLinha=sheet.getLastRow();
  if(ultimaLinha<2) return -1;
  const valores=sheet.getRange(2,coluna,ultimaLinha-1,1).getValues();
  const procurado=normalizarComparacao(valor);
  for(let i=0;i<valores.length;i++){if(normalizarComparacao(valores[i][0])===procurado) return i+2;}
  return -1;
}

function atualizarVeiculoNaAba(ss,nomeAba,placaAntiga,nomeNovo,placaNova){
  const sheet=obterAba(ss,nomeAba);
  const linha=encontrarLinhaPorValor(sheet,2,placaAntiga);
  if(linha===-1) return;
  sheet.getRange(linha,1).setValue(nomeNovo);
  sheet.getRange(linha,2).setValue(placaNova);
}

function atualizarHistoricoVeiculo(ss,nomeAba,placaAntiga,nomeNovo,placaNova,colPlaca,colNome){
  const sheet=obterAba(ss,nomeAba);
  const ultimaLinha=sheet.getLastRow();
  if(ultimaLinha<2) return;
  const dados=sheet.getRange(2,1,ultimaLinha-1,sheet.getLastColumn()).getValues();
  for(let i=0;i<dados.length;i++){
    if(normalizarComparacao(dados[i][colPlaca-1])===normalizarComparacao(placaAntiga)){
      sheet.getRange(i+2,colPlaca).setValue(placaNova);
      sheet.getRange(i+2,colNome).setValue(nomeNovo);
    }
  }
}

function excluirDaAba(ss,nomeAba,coluna,valor){
  const sheet=obterAba(ss,nomeAba);
  const ultimaLinha=sheet.getLastRow();
  if(ultimaLinha<2) return;
  const valores=sheet.getRange(2,coluna,ultimaLinha-1,1).getValues();
  const procurado=normalizarComparacao(valor);
  for(let i=valores.length-1;i>=0;i--){if(normalizarComparacao(valores[i][0])===procurado) sheet.deleteRow(i+2);}
}
