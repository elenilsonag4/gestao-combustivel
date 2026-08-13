// ============================================================
// LÓGICA DE ALTERNÂNCIA DE TEMA (CLARO / INTERMEDIÁRIO / ESCURO)
// ============================================================

const THEME_KEY = "ag4_tema_opcao";

function toggleTheme() {
  const temaAtual = localStorage.getItem(THEME_KEY) || "light";
  let novoTema = "light";

  if (temaAtual === "light") {
    novoTema = "dim";
  } else if (temaAtual === "dim") {
    novoTema = "dark";
  } else {
    novoTema = "light";
  }

  aplicarTema(novoTema);
}

function aplicarTema(tema) {
  document.body.classList.remove("dark-theme", "dim-theme");

  if (tema === "dim") {
    document.body.classList.add("dim-theme");
  } else if (tema === "dark") {
    document.body.classList.add("dark-theme");
  }

  localStorage.setItem(THEME_KEY, tema);
  atualizarIconeTema(tema);
}

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem(THEME_KEY);
  if (temaSalvo) {
    aplicarTema(temaSalvo);
  } else {
    const prefereEscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    aplicarTema(prefereEscuro ? "dark" : "light");
  }
}

function atualizarIconeTema(tema) {
  const btn = document.getElementById("btnThemeToggle");
  if (!btn) return;

  if (tema === "dim") {
    btn.textContent = "🌓";
    btn.title = "Tema Atual: Intermediário (Clique para Escuro)";
  } else if (tema === "dark") {
    btn.textContent = "🌙";
    btn.title = "Tema Atual: Escuro (Clique para Claro)";
  } else {
    btn.textContent = "☀️";
    btn.title = "Tema Atual: Claro (Clique para Intermediário)";
  }
}

// Inicialização das funções ao carregar o DOM
document.addEventListener("DOMContentLoaded", () => {
  aplicarTemaSalvo();
});
