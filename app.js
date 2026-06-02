const state = { config: null, query: "" };

const categoryOrder = [
  "Operación diaria",
  "Clientes & proyectos",
  "IA & productividad",
  "Marketing & contenido",
  "Webs & tecnología",
  "Administración",
  "Archivo inteligente"
];

function normalize(str){ return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }

function updateClock(){
  const now = new Date();
  document.getElementById("dateText").textContent = now.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"short" });
  document.getElementById("timeText").textContent = now.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });
}
setInterval(updateClock, 1000);
updateClock();

function renderQuick(){
  const container = document.getElementById("quickActions");
  container.innerHTML = "";
  state.config.quickActions.forEach(item => {
    const a = document.createElement("a");
    a.className = "quick-link";
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.innerHTML = `<div><b>${item.name}</b><br><small>${item.label}</small></div><span class="badge">Abrir</span>`;
    container.appendChild(a);
  });
}

function groupLinks(links){
  const grouped = {};
  links.forEach(link => {
    const cat = link.category || "Archivo inteligente";
    if(!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(link);
  });
  return grouped;
}

function renderCards(){
  const q = normalize(state.query);
  const cards = document.getElementById("cards");
  cards.innerHTML = "";

  let links = state.config.links || [];
  if(q){
    links = links.filter(l => normalize(`${l.name} ${l.url} ${l.category} ${l.tag}`).includes(q));
  }

  document.getElementById("totalLinks").textContent = state.config.links.length;
  document.getElementById("totalCategories").textContent = new Set(state.config.links.map(l => l.category)).size;

  if(!links.length){
    cards.innerHTML = `<div class="empty">No encontré ese acceso. Edita links.json para agregarlo.</div>`;
    return;
  }

  const grouped = groupLinks(links);
  const orderedCats = categoryOrder.filter(c => grouped[c]).concat(Object.keys(grouped).filter(c => !categoryOrder.includes(c)));

  orderedCats.forEach(cat => {
    const card = document.createElement("section");
    card.className = "card";
    const sorted = grouped[cat].sort((a,b) => a.name.localeCompare(b.name));
    card.innerHTML = `<h3>${cat}</h3><div class="links"></div>`;
    const list = card.querySelector(".links");

    sorted.forEach(link => {
      const a = document.createElement("a");
      a.className = "link";
      a.href = link.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.innerHTML = `<div><b>${link.name}</b><br><small>${link.tag || ""}</small></div><span>↗</span>`;
      list.appendChild(a);
    });

    cards.appendChild(card);
  });
}

async function boot(){
  const res = await fetch("./links.json");
  state.config = await res.json();

  document.getElementById("brandTitle").textContent = state.config.brand.title;
  document.getElementById("subtitle").textContent = state.config.brand.subtitle;
  document.getElementById("tagline").textContent = state.config.brand.tagline;

  renderQuick();
  renderCards();

  const search = document.getElementById("search");
  search.addEventListener("input", e => {
    state.query = e.target.value;
    renderCards();
  });

  window.addEventListener("keydown", e => {
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"){
      e.preventDefault();
      search.focus();
    }
  });
}

boot();
