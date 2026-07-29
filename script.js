let veiculos = JSON.parse(localStorage.getItem('veiculos')) || [];
let abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
let indiceEditando = null;
let indiceExcluindo = null;
const SENHA = "frot@AG4";

// FORÇA MAIUSCULO AO DIGITAR
['placaNova','nomeVeiculo','motorista'].forEach(id => {
    let el = document.getElementById(id);
    if(el) el.addEventListener('keyup', () => el.value = el.value.toUpperCase());
});

function atualizarSelects() {
    // SEMPRE ORDENA ANTES DE MOSTRAR
    veiculos.sort((a, b) => a.nome.localeCompare(b.nome));

    let options = '<option value="">SELECIONE O VEICULO</option>';
    options += veiculos.map(v => `<option value="${v.placa}">${v.nome} - ${v.placa}</option>`).join('');
    document.getElementById('selectVeiculo').innerHTML = options;

    let checks = veiculos.map(v => `<label class="check-veiculo"><input type="checkbox" value="${v.placa}"> ${v.nome} - ${v.placa}</label>`).join('');
    document.getElementById('listaVeiculosCheck').innerHTML = checks;
    mostrar();
}

function mudaTipoRel() {
    let tipo = document.querySelector('input[name="tipoRel"]:checked').value;
    document.getElementById('listaVeiculosCheck').style.display = tipo === 'personalizado'? 'block' : 'none';
}

function cadastrarVeiculo() {
    let placa = document.getElementById('placaNova').value.toUpperCase().trim();
    let nome = document.getElementById('nomeVeiculo').value.toUpperCase().trim();
    if(!placa ||!nome) return alert('PREENCHA PLACA E NOME');
    if(veiculos.find(v => v.placa === placa)) return alert('PLACA JÁ CADASTRADA');

    veiculos.push({placa, nome});
    veiculos.sort((a, b) => a.nome.localeCompare(b.nome)); // ORDENA E SALVA
    localStorage.setItem('veiculos', JSON.stringify(veiculos));

    alert('VEÍCULO CADASTRADO!');
    document.getElementById('placaNova').value = '';
    document.getElementById('nomeVeiculo').value = '';
    atualizarSelects();
}

function salvar() {
    let novo = {
        placa: document.getElementById('selectVeiculo').value,
        data: document.getElementById('data').value,
        motorista: document.getElementById('motorista').value.toUpperCase().trim(),
        litros: parseFloat(document.getElementById('litros').value),
        valor: parseFloat(document.getElementById('valor').value),
        km: parseInt(document.getElementById('km').value)
    };
    if(!novo.placa ||!novo.data ||!novo.litros) return alert('PREENCHA OS CAMPOS OBRIGATÓRIOS');

    if(indiceEditando!== null) {
        abastecimentos[indiceEditando] = novo;
        indiceEditando = null;
        alert('ABASTECIMENTO EDITADO!');
    } else {
        abastecimentos.push(novo);
        alert('ABASTECIMENTO SALVO!');
    }

    localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
    document.getElementById('motorista').value = '';
    fecharModal();
    mostrar();
}

function mostrar() {
    let ultimos = abastecimentos.slice(-5).reverse();
    document.getElementById('lista').innerHTML = ultimos.map((a, i) => {
        let indiceReal = abastecimentos.length - 1 - i;
        return `<div class="item-lista">
            <p><b>${a.data}</b> - ${a.placa} - ${a.motorista || 'SEM MOTORISTA'} - ${a.litros}L - R$${a.valor.toFixed(2)}</p>
            <div class="botoes-lista">
                <button class="btn-editar" onclick="pedirSenha(${indiceReal}, 'editar')">Editar</button>
                <button class="btn-excluir" onclick="pedirSenha(${indiceReal}, 'excluir')">Excluir</button>
            </div>
        </div>`
    }).join('');
}

function pedirSenha(indice, acao) {
    if(acao === 'editar') indiceEditando = indice;
    if(acao === 'excluir') indiceExcluindo = indice;
    document.getElementById('tituloModal').innerText = "DIGITE A SENHA PARA CONTINUAR";
    document.getElementById('corpoModal').innerHTML = `
        <input type="password" id="senhaInput" placeholder="Senha">
        <button onclick="validarSenha('${acao}')">Confirmar</button>
    `;
    document.getElementById('modalEdicao').style.display = "block";
    // FORÇA MAIUSCULO NO EDITAR TAMBEM
    setTimeout(() => {
        let el = document.getElementById('editMotorista');
        if(el) el.addEventListener('keyup', () => el.value = el.value.toUpperCase());
    }, 100);
}

function validarSenha(acao) {
    if(document.getElementById('senhaInput').value === SENHA) {
        if(acao === 'editar') abrirFormularioEdicao();
        if(acao === 'excluir') excluirItem();
    } else {
        alert('SENHA INCORRETA!');
    }
}

function abrirFormularioEdicao() {
    let a = abastecimentos[indiceEditando];
    document.getElementById('tituloModal').innerText = "EDITAR ABASTECIMENTO";
    document.getElementById('corpoModal').innerHTML = `
        <input type="date" id="editData" value="${a.data}">
        <input type="text" id="editMotorista" value="${a.motorista || ''}" placeholder="MOTORISTA">
        <input type="number" id="editLitros" value="${a.litros}" step="0.01" placeholder="LITROS">
        <input type="number" id="editValor" value="${a.valor}" step="0.01" placeholder="VALOR">
        <input type="number" id="editKm" value="${a.km}" placeholder="KM">
        <button onclick="salvarEdicao()">SALVAR ALTERAÇÕES</button>
    `;
}

function salvarEdicao() {
    document.getElementById('data').value = document.getElementById('editData').value;
    document.getElementById('motorista').value = document.getElementById('editMotorista').value.toUpperCase().trim();
    document.getElementById('litros').value = document.getElementById('editLitros').value;
    document.getElementById('valor').value = document.getElementById('editValor').value;
    document.getElementById('km').value = document.getElementById('editKm').value;
    document.getElementById('selectVeiculo').value = abastecimentos[indiceEditando].placa;
    salvar();
}

function excluirItem() {
    if(confirm("TEM CERTEZA QUE DESEJA EXCLUIR ESTE LANÇAMENTO?")) {
        abastecimentos.splice(indiceExcluindo, 1);
        localStorage.setItem('abastecimentos', JSON.stringify(abastecimentos));
        alert("LANÇAMENTO EXCLUÍDO!");
        fecharModal();
        mostrar();
    } else {
        fecharModal();
    }
}

function fecharModal() {
    document.getElementById('modalEdicao').style.display = "none";
    indiceEditando = null;
    indiceExcluindo = null;
}

function gerarPDF() {
    const tipo = document.querySelector('input[name="tipoRel"]:checked').value;
    let placasParaRelatorio = [];
    if(tipo === 'geral') placasParaRelatorio = veiculos.map(v => v.placa);
    else placasParaRelatorio = [...document.querySelectorAll('#listaVeiculosCheck input:checked')].map(cb => cb.value);
    if(placasParaRelatorio.length === 0) return alert('SELECIONE PELO MENOS 1 VEÍCULO');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("RELATORIO DE GESTAO DE COMBUSTIVEL", 15, 15);
    let y = 25;
    placasParaRelatorio.forEach(placa => {
        const veiculo = veiculos.find(v => v.placa === placa);
        const dadosFiltrados = abastecimentos.filter(a => a.placa === placa).sort((a,b) => new Date(a.data) - new Date(b.data));
        if(dadosFiltrados.length === 0) return;
        doc.setFontSize(14);
        doc.text(`${veiculo.nome} - ${veiculo.placa}`, 15, y);
        y += 5;
        let kmAnterior = 0;
        const tableData = dadosFiltrados.map((d, i) => {
            let kmRodado = i > 0? d.km - kmAnterior : 0;
            let kml = kmRodado > 0 && d.litros > 0? (kmRodado / d.litros).toFixed(2) : '-';
            kmAnterior = d.km;
            return [d.data, d.motorista || '-', d.km, kmRodado, d.litros, `R$ ${d.valor.toFixed(2)}`, kml];
        });
        doc.autoTable({
            startY: y + 2,
            head: [['DATA', 'MOTORISTA', 'KM', 'KM RODADO', 'LITROS', 'VALOR', 'KM/L']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8 }
        });
        y = doc.lastAutoTable.finalY + 15;
    });
    window.open(doc.output('bloburl'), '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    atualizarSelects();
    mudaTipoRel();
});