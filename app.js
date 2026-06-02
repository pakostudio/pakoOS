const STORAGE_KEY = "pako_os_links_v2";
const CONFIG_KEY = "pako_os_config_v2";
const categoryOrder = ["Operación diaria","Clientes & proyectos","IA & productividad","Marketing & contenido","Webs & tecnología","Administración","Archivo inteligente"];
const state = { config:null, query:"", adminQuery:"" };

function normalize(str){ return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function uid(){ return "link-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7); }
function domain(url){ try { return new URL(url).hostname.replace("www.",""); } catch { return ""; } }
function escapeHtml(str){ return (str || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }

function guessCategory(name,url){
  const text = normalize(`${name} ${url}`);
  if(["calendar","meet.google","drive.google","mail","icloud.com/mail","titan","meetgeek","whatsapp"].some(k=>text.includes(k))) return "Operación diaria";
  if(["chatgpt","claude","perplexity","notebooklm","elevenlabs","gemini","runway"].some(k=>text.includes(k))) return "IA & productividad";
  if(["canva","meta","facebook","instagram","tiktok","linkedin","spotify","youtube","envato","freepik","apollo","phantombuster"].some(k=>text.includes(k))) return "Marketing & contenido";
  if(["wordpress","elementor","hostgator","cpanel","github","shopify","cloudflare"].some(k=>text.includes(k))) return "Webs & tecnología";
  if(["sat","impi","apple","factur","sicofi","banco"].some(k=>text.includes(k))) return "Administración";
  if(["gpc","pmps","prokicks","pro kicks","mavas","menlun","eduardo","lozowsky","quasar","strongmax","zafir"].some(k=>text.includes(k))) return "Clientes & proyectos";
  return "Archivo inteligente";
}

function updateClock(){
  const now = new Date();
  document.getElementById("dateText").textContent = now.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"});
  document.getElementById("timeText").textContent = now.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"});
}
setInterval(updateClock,1000); updateClock();

async function boot(){
  const res = await fetch("./links.json");
  const baseConfig = await res.json();
  const savedConfig = localStorage.getItem(CONFIG_KEY);
  const savedLinks = localStorage.getItem(STORAGE_KEY);

  state.config = savedConfig ? JSON.parse(savedConfig) : baseConfig;
  if(savedLinks) state.config.links = JSON.parse(savedLinks);

  renderAll();
  bindEvents();
}

function persist(){
  localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config.links));
}

function renderAll(){
  document.getElementById("brandTitle").textContent = state.config.brand.title;
  document.getElementById("subtitle").textContent = state.config.brand.subtitle;
  document.getElementById("tagline").textContent = state.config.brand.tagline;
  renderQuick(); renderCards(); renderAdminList();
}

function renderQuick(){
  const c = document.getElementById("quickActions");
  c.innerHTML = "";
  state.config.quickActions.forEach(item=>{
    const a = document.createElement("a");
    a.className="quick-link"; a.href=item.url; a.target="_blank"; a.rel="noopener noreferrer";
    a.innerHTML = `<div><b>${escapeHtml(item.name)}</b><br><small>${escapeHtml(item.label)}</small></div><span class="badge">Abrir</span>`;
    c.appendChild(a);
  });
}

function filteredLinks(query){
  const q = normalize(query);
  let links = state.config.links || [];
  if(q) links = links.filter(l => normalize(`${l.name} ${l.url} ${l.category} ${l.tag}`).includes(q));
  return links;
}

function renderCards(){
  const links = filteredLinks(state.query);
  document.getElementById("totalLinks").textContent = state.config.links.length;
  document.getElementById("totalCategories").textContent = new Set(state.config.links.map(l=>l.category)).size;
  const cards = document.getElementById("cards");
  cards.innerHTML = "";
  if(!links.length){ cards.innerHTML = `<div class="empty">No encontré ese acceso. Agrégalo desde Panel Admin.</div>`; return; }

  const grouped = {};
  links.forEach(l => { (grouped[l.category] ||= []).push(l); });
  const cats = categoryOrder.filter(c=>grouped[c]).concat(Object.keys(grouped).filter(c=>!categoryOrder.includes(c)));

  cats.forEach(cat=>{
    const card = document.createElement("section");
    card.className = "card";
    card.innerHTML = `<h3>${escapeHtml(cat)}</h3><div class="links"></div>`;
    const list = card.querySelector(".links");
    grouped[cat].sort((a,b)=>a.name.localeCompare(b.name)).forEach(link=>{
      const a = document.createElement("a");
      a.className="link"; a.href=link.url; a.target="_blank"; a.rel="noopener noreferrer";
      a.innerHTML = `<div><b>${escapeHtml(link.name)}</b><br><small>${escapeHtml(link.tag || domain(link.url))}</small></div><span>↗</span>`;
      list.appendChild(a);
    });
    cards.appendChild(card);
  });
}

function renderAdminList(){
  const c = document.getElementById("adminList");
  if(!c) return;
  const links = filteredAdminLinks();
  c.innerHTML = "";
  links.sort((a,b)=>a.name.localeCompare(b.name)).forEach(link=>{
    const row = document.createElement("div");
    row.className = "admin-item";
    row.innerHTML = `
      <div>
        <b>${escapeHtml(link.name)}</b>
        <small>${escapeHtml(link.category)} · ${escapeHtml(link.url)}</small>
      </div>
      <div class="admin-actions">
        <button class="btn" data-edit="${link.id}">Editar</button>
        <button class="btn danger" data-delete="${link.id}">Eliminar</button>
      </div>`;
    c.appendChild(row);
  });
}

function filteredAdminLinks(){
  const q = normalize(state.adminQuery);
  let links = state.config.links || [];
  if(q) links = links.filter(l => normalize(`${l.name} ${l.url} ${l.category} ${l.tag}`).includes(q));
  return links;
}

function resetForm(){
  document.getElementById("formTitle").textContent = "Agregar favorito";
  document.getElementById("linkId").value = "";
  document.getElementById("nameInput").value = "";
  document.getElementById("urlInput").value = "";
  document.getElementById("categoryInput").value = "Operación diaria";
  document.getElementById("tagInput").value = "";
}

function editLink(id){
  const link = state.config.links.find(l=>l.id===id);
  if(!link) return;
  document.getElementById("formTitle").textContent = "Editar favorito";
  document.getElementById("linkId").value = link.id;
  document.getElementById("nameInput").value = link.name;
  document.getElementById("urlInput").value = link.url;
  document.getElementById("categoryInput").value = link.category;
  document.getElementById("tagInput").value = link.tag || "";
  document.getElementById("nameInput").focus();
}

function deleteLink(id){
  const link = state.config.links.find(l=>l.id===id);
  if(!link) return;
  if(!confirm(`Eliminar "${link.name}" de PAKO OS?`)) return;
  state.config.links = state.config.links.filter(l=>l.id!==id);
  persist(); renderAll();
}

function exportBackup(){
  const blob = new Blob([JSON.stringify(state.config, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pako-os-backup-links.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importBookmarks(file){
  const reader = new FileReader();
  reader.onload = () => {
    const html = reader.result;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const anchors = [...doc.querySelectorAll("a[href]")];
    const existing = new Set(state.config.links.map(l=>l.url.toLowerCase().replace(/\/$/,"")));
    let added = 0;

    anchors.forEach(a=>{
      const url = a.href;
      const name = (a.textContent || domain(url) || "Nuevo favorito").trim();
      const key = url.toLowerCase().replace(/\/$/,"");
      if(!url || existing.has(key)) return;
      existing.add(key);
      state.config.links.push({
        id: uid(),
        name,
        url,
        category: guessCategory(name,url),
        tag: domain(url),
        favorite: false
      });
      added++;
    });

    persist(); renderAll();
    alert(`Importación lista. Nuevos favoritos agregados: ${added}`);
  };
  reader.readAsText(file);
}

function bindEvents(){
  const search = document.getElementById("search");
  search.addEventListener("input", e=>{ state.query = e.target.value; renderCards(); });

  window.addEventListener("keydown", e=>{
    if((e.metaKey || e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); search.focus(); }
  });

  const modal = document.getElementById("adminModal");
  document.getElementById("adminBtn").addEventListener("click", ()=>{ modal.showModal(); renderAdminList(); });
  document.getElementById("closeAdmin").addEventListener("click", ()=>modal.close());
  document.getElementById("resetForm").addEventListener("click", resetForm);
  document.getElementById("exportBackup").addEventListener("click", exportBackup);

  document.getElementById("resetLocal").addEventListener("click", ()=>{
    if(!confirm("Esto borra cambios locales y restaura links.json original. ¿Continuar?")) return;
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CONFIG_KEY); location.reload();
  });

  document.getElementById("bookmarkImport").addEventListener("change", e=>{
    const file = e.target.files[0]; if(file) importBookmarks(file);
  });

  document.getElementById("adminSearch").addEventListener("input", e=>{ state.adminQuery = e.target.value; renderAdminList(); });

  document.getElementById("adminList").addEventListener("click", e=>{
    const edit = e.target.dataset.edit;
    const del = e.target.dataset.delete;
    if(edit) editLink(edit);
    if(del) deleteLink(del);
  });

  document.getElementById("linkForm").addEventListener("submit", e=>{
    e.preventDefault();
    const id = document.getElementById("linkId").value || uid();
    const payload = {
      id,
      name: document.getElementById("nameInput").value.trim(),
      url: document.getElementById("urlInput").value.trim(),
      category: document.getElementById("categoryInput").value,
      tag: document.getElementById("tagInput").value.trim() || domain(document.getElementById("urlInput").value.trim()),
      favorite: false
    };

    if(!/^https?:\/\//i.test(payload.url)){
      alert("La URL debe empezar con https:// o http://");
      return;
    }

    const idx = state.config.links.findIndex(l=>l.id===id);
    if(idx >= 0) state.config.links[idx] = payload;
    else state.config.links.push(payload);

    persist(); resetForm(); renderAll();
  });
}

boot();
