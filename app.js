const STORAGE_KEY = "pako_os_links_v2";
const CONFIG_KEY = "pako_os_config_v2";
const categoryOrder = [
  "Operación diaria",
  "Clientes & proyectos",
  "IA & productividad",
  "Marketing & contenido",
  "Webs & tecnología",
  "Administración",
  "Archivo inteligente"
];

const state = {
  config: null,
  query: "",
  adminQuery: ""
};

// ── UTILS ──
function normalize(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function uid() {
  return "link-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
}

function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getFaviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch {
    return "";
  }
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function guessCategory(name, url) {
  const text = normalize(`${name} ${url}`);
  if (["calendar", "meet.google", "drive.google", "mail", "icloud.com/mail", "titan", "meetgeek", "whatsapp", "cpanel"].some(k => text.includes(k))) {
    return "Operación diaria";
  }
  if (["chatgpt", "claude", "perplexity", "notebooklm", "elevenlabs", "gemini", "runway", "vizard", "learningstudio", "tutorai"].some(k => text.includes(k))) {
    return "IA & productividad";
  }
  if (["canva", "meta", "facebook", "instagram", "tiktok", "linkedin", "spotify", "youtube", "envato", "freepik", "apollo", "phantombuster", "linktree"].some(k => text.includes(k))) {
    return "Marketing & contenido";
  }
  if (["wordpress", "elementor", "hostgator", "github", "shopify", "cloudflare", "crm", "leads", "facturacion", "menlun", "pmps"].some(k => text.includes(k))) {
    return "Webs & tecnología";
  }
  if (["sat", "impi", "apple", "factur", "sicofi", "banco", "bepensa"].some(k => text.includes(k))) {
    return "Administración";
  }
  if (["gpc", "prokicks", "pro kicks", "mavas", "eduardo", "lozowsky", "quasar", "strongmax", "zafir", "ofunam"].some(k => text.includes(k))) {
    return "Clientes & proyectos";
  }
  return "Archivo inteligente";
}

function showToast(msg, danger = false) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast" + (danger ? " danger" : "");
  void t.offsetWidth;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const dateEl = document.getElementById("dateText");
  const timeEl = document.getElementById("timeText");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "short"
    });
  }
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

// ── BOOT & PERSISTENCE ──
async function boot() {
  updateClock();
  setInterval(updateClock, 1000);

  let baseConfig = null;
  try {
    const res = await fetch("./links.json");
    if (res.ok) {
      baseConfig = await res.json();
    }
  } catch (err) {
    console.warn("No se pudo cargar links.json directamente, usando almacenamiento local o datos mínimos:", err);
  }

  const savedConfig = localStorage.getItem(CONFIG_KEY);
  const savedLinks = localStorage.getItem(STORAGE_KEY);

  if (savedConfig) {
    try {
      state.config = JSON.parse(savedConfig);
    } catch {
      state.config = baseConfig;
    }
  } else {
    state.config = baseConfig || {
      brand: {
        title: "PAKO OS",
        subtitle: "Command Center de favoritos y productividad.",
        tagline: "Where strategy becomes perception"
      },
      quickActions: [],
      links: []
    };
  }

  if (savedLinks) {
    try {
      state.config.links = JSON.parse(savedLinks);
    } catch (e) {
      console.error("Error parseando enlaces locales:", e);
    }
  } else if (baseConfig && baseConfig.links) {
    state.config.links = baseConfig.links;
  }

  renderAll();
  bindEvents();
}

function persist() {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config.links));
  } catch (e) {
    console.error("Error guardando en localStorage:", e);
  }
}

// ── RENDER ──
function renderAll() {
  if (!state.config) return;

  const brandTitle = document.getElementById("brandTitle");
  const subtitle = document.getElementById("subtitle");
  const tagline = document.getElementById("tagline");

  if (brandTitle && state.config.brand) brandTitle.textContent = state.config.brand.title;
  if (subtitle && state.config.brand) subtitle.textContent = state.config.brand.subtitle;
  if (tagline && state.config.brand) tagline.textContent = state.config.brand.tagline;

  renderMetrics();
  renderQuick();
  renderCards();
  renderAdminList();
}

function renderMetrics() {
  const total = (state.config.links || []).length;
  const cats = new Set((state.config.links || []).map(l => l.category || "General")).size;

  const totalEl = document.getElementById("totalLinks");
  const catsEl = document.getElementById("totalCategories");
  if (totalEl) totalEl.textContent = total;
  if (catsEl) catsEl.textContent = cats;
}

function renderQuick() {
  const container = document.getElementById("quickActions");
  if (!container) return;
  container.innerHTML = "";

  const items = state.config.quickActions || [];
  items.forEach(item => {
    const a = document.createElement("a");
    a.className = "quick-link";
    a.href = item.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";

    const favUrl = getFaviconUrl(item.url);
    a.innerHTML = `
      <div class="quick-info">
        <div class="quick-favicon">
          <img src="${escapeHtml(favUrl)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='✦'">
        </div>
        <div class="quick-text">
          <b>${escapeHtml(item.name)}</b>
          <small>${escapeHtml(item.label || domain(item.url))}</small>
        </div>
      </div>
      <span class="badge">Abrir</span>
    `;
    container.appendChild(a);
  });
}

function filteredLinks(query) {
  const q = normalize(query);
  let links = state.config.links || [];
  if (!q) return links;
  return links.filter(l =>
    normalize(`${l.name} ${l.url} ${l.category || ""} ${l.tag || ""}`).includes(q)
  );
}

function renderCards() {
  const container = document.getElementById("cards");
  if (!container) return;
  container.innerHTML = "";

  const links = filteredLinks(state.query);
  if (!links.length) {
    container.innerHTML = `
      <div class="empty">
        <span>🔍</span>
        No se encontraron favoritos para "${escapeHtml(state.query)}".<br>
        <small style="color:var(--muted);margin-top:6px;display:inline-block;">Puedes agregar uno nuevo desde el botón superior o el Panel Admin.</small>
      </div>
    `;
    return;
  }

  // Group by category
  const grouped = {};
  links.forEach(l => {
    const cat = l.category || "Archivo inteligente";
    (grouped[cat] ||= []).push(l);
  });

  const orderedCategories = categoryOrder
    .filter(c => grouped[c])
    .concat(Object.keys(grouped).filter(c => !categoryOrder.includes(c)));

  orderedCategories.forEach(cat => {
    const items = grouped[cat];
    items.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));

    const block = document.createElement("section");
    block.className = "category-block";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
      <h3>${escapeHtml(cat)}</h3>
      <span class="category-count">${items.length} ${items.length === 1 ? "link" : "links"}</span>
    `;
    block.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "links-grid";

    items.forEach(link => {
      const itemEl = document.createElement("div");
      itemEl.className = "fav-item";
      itemEl.dataset.id = link.id;

      const favUrl = getFaviconUrl(link.url);
      const tagText = link.tag || domain(link.url);
      const initial = (link.name || "P").charAt(0).toUpperCase();

      itemEl.innerHTML = `
        <a class="fav-main" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
          <div class="fav-favicon">
            <img src="${escapeHtml(favUrl)}" alt="" loading="lazy" onerror="this.parentElement.textContent='${initial}'">
          </div>
          <div class="fav-meta">
            <div class="fav-name">${escapeHtml(link.name)}</div>
            <div class="fav-tag">${escapeHtml(tagText)}</div>
          </div>
        </a>
        <div class="fav-actions">
          <button class="action-btn edit" data-edit="${escapeHtml(link.id)}" title="Editar favorito">✏️</button>
          <a class="action-btn" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" title="Abrir en pestaña nueva">↗</a>
          <button class="action-btn del" data-del="${escapeHtml(link.id)}" title="Eliminar favorito">✕</button>
        </div>
      `;

      grid.appendChild(itemEl);
    });

    block.appendChild(grid);
    container.appendChild(block);
  });
}

function filteredAdminLinks() {
  const q = normalize(state.adminQuery);
  let links = state.config.links || [];
  if (!q) return links;
  return links.filter(l =>
    normalize(`${l.name} ${l.url} ${l.category || ""} ${l.tag || ""}`).includes(q)
  );
}

function renderAdminList() {
  const listEl = document.getElementById("adminList");
  if (!listEl) return;
  listEl.innerHTML = "";

  const links = filteredAdminLinks();
  links.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name)));

  if (!links.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px;">Sin resultados.</div>`;
    return;
  }

  links.forEach(link => {
    const row = document.createElement("div");
    row.className = "admin-item";
    row.innerHTML = `
      <div class="admin-item-info">
        <b>${escapeHtml(link.name)}</b>
        <small>${escapeHtml(link.category)} · ${escapeHtml(link.url)}</small>
      </div>
      <div class="admin-item-actions">
        <button class="btn ghost" style="padding:6px 10px;font-size:12px;" data-admin-edit="${escapeHtml(link.id)}">Editar</button>
        <button class="btn danger" style="padding:6px 10px;font-size:12px;" data-admin-del="${escapeHtml(link.id)}">Eliminar</button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

// ── FORM & ACTIONS ──
function resetForm() {
  const title = document.getElementById("formTitle");
  if (title) title.textContent = "Agregar favorito";
  document.getElementById("linkId").value = "";
  document.getElementById("nameInput").value = "";
  document.getElementById("urlInput").value = "";
  document.getElementById("categoryInput").value = "Operación diaria";
  document.getElementById("tagInput").value = "";
}

function openEditModal(id) {
  const link = (state.config.links || []).find(l => l.id === id);
  if (!link) return;

  const modal = document.getElementById("adminModal");
  document.getElementById("formTitle").textContent = "Editar favorito";
  document.getElementById("linkId").value = link.id;
  document.getElementById("nameInput").value = link.name;
  document.getElementById("urlInput").value = link.url;
  document.getElementById("categoryInput").value = link.category || "Operación diaria";
  document.getElementById("tagInput").value = link.tag || "";

  if (!modal.open) {
    modal.showModal();
    renderAdminList();
  }
  document.getElementById("nameInput").focus();
}

function deleteLink(id) {
  const link = (state.config.links || []).find(l => l.id === id);
  if (!link) return;

  if (!confirm(`¿Eliminar "${link.name}" de favoritos?`)) return;

  state.config.links = state.config.links.filter(l => l.id !== id);
  persist();
  renderAll();
  showToast(`"${link.name}" eliminado`, true);
}

function exportBackup() {
  const data = JSON.stringify(state.config, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "pako-os-backup-links.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Respaldo JSON descargado con éxito");
}

function importBookmarks(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const html = reader.result;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const anchors = [...doc.querySelectorAll("a[href]")];

      const existingUrls = new Set(
        (state.config.links || []).map(l => l.url.toLowerCase().replace(/\/$/, ""))
      );
      let added = 0;

      anchors.forEach(a => {
        const url = (a.getAttribute("href") || "").trim();
        if (!url || !/^https?:\/\//i.test(url)) return;

        const normalizedUrl = url.toLowerCase().replace(/\/$/, "");
        if (existingUrls.has(normalizedUrl)) return;
        existingUrls.add(normalizedUrl);

        const name = (a.textContent || domain(url) || "Nuevo favorito").trim();
        const guessedCat = guessCategory(name, url);

        state.config.links.push({
          id: uid(),
          name,
          url,
          category: guessedCat,
          tag: domain(url),
          favorite: false
        });
        added++;
      });

      persist();
      renderAll();
      showToast(`Importación lista: +${added} favoritos agregados`);
    } catch (err) {
      alert("Error procesando el archivo de favoritos: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ── EVENT LISTENERS ──
function bindEvents() {
  const search = document.getElementById("search");
  if (search) {
    search.addEventListener("input", e => {
      state.query = e.target.value;
      renderCards();
    });
  }

  // Keyboard shortcut ⌘K / Ctrl+K
  window.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (search) search.focus();
    }
  });

  const modal = document.getElementById("adminModal");

  // Open Admin modal
  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      resetForm();
      modal.showModal();
      renderAdminList();
    });
  }

  // Quick Add Button in header
  const quickAddBtn = document.getElementById("quickAddBtn");
  if (quickAddBtn) {
    quickAddBtn.addEventListener("click", () => {
      resetForm();
      modal.showModal();
      renderAdminList();
      setTimeout(() => document.getElementById("nameInput").focus(), 50);
    });
  }

  // Close Admin modal
  const closeAdmin = document.getElementById("closeAdmin");
  if (closeAdmin) {
    closeAdmin.addEventListener("click", () => modal.close());
  }

  const resetFormBtn = document.getElementById("resetForm");
  if (resetFormBtn) {
    resetFormBtn.addEventListener("click", resetForm);
  }

  // Backup & Restore
  const exportBackupBtn = document.getElementById("exportBackup");
  if (exportBackupBtn) {
    exportBackupBtn.addEventListener("click", exportBackup);
  }

  const resetLocalBtn = document.getElementById("resetLocal");
  if (resetLocalBtn) {
    resetLocalBtn.addEventListener("click", () => {
      if (!confirm("Esto eliminará cambios locales en este navegador y restaurará la configuración base de links.json. ¿Continuar?")) return;
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CONFIG_KEY);
      location.reload();
    });
  }

  // Import bookmarks
  const bookmarkImport = document.getElementById("bookmarkImport");
  if (bookmarkImport) {
    bookmarkImport.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        importBookmarks(file);
        bookmarkImport.value = "";
      }
    });
  }

  // Admin search
  const adminSearch = document.getElementById("adminSearch");
  if (adminSearch) {
    adminSearch.addEventListener("input", e => {
      state.adminQuery = e.target.value;
      renderAdminList();
    });
  }

  // Card actions (Edit and Delete)
  const cardsContainer = document.getElementById("cards");
  if (cardsContainer) {
    cardsContainer.addEventListener("click", e => {
      const editId = e.target.closest("[data-edit]")?.dataset.edit;
      const delId = e.target.closest("[data-del]")?.dataset.del;
      if (editId) {
        e.preventDefault();
        openEditModal(editId);
      } else if (delId) {
        e.preventDefault();
        deleteLink(delId);
      }
    });
  }

  // Admin list actions (Edit and Delete)
  const adminList = document.getElementById("adminList");
  if (adminList) {
    adminList.addEventListener("click", e => {
      const editId = e.target.dataset.adminEdit;
      const delId = e.target.dataset.adminDel;
      if (editId) openEditModal(editId);
      if (delId) deleteLink(delId);
    });
  }

  // Link Form Submit
  const linkForm = document.getElementById("linkForm");
  if (linkForm) {
    linkForm.addEventListener("submit", e => {
      e.preventDefault();
      const id = document.getElementById("linkId").value || uid();
      const name = document.getElementById("nameInput").value.trim();
      let url = document.getElementById("urlInput").value.trim();
      const category = document.getElementById("categoryInput").value;
      let tag = document.getElementById("tagInput").value.trim();

      if (!name) {
        document.getElementById("nameInput").focus();
        return;
      }

      if (!url) {
        document.getElementById("urlInput").focus();
        return;
      }

      if (!/^https?:\/\//i.test(url)) {
        alert("La URL debe comenzar con http:// o https://");
        document.getElementById("urlInput").focus();
        return;
      }

      if (!tag) {
        tag = domain(url);
      }

      const payload = {
        id,
        name,
        url,
        category,
        tag,
        favorite: false
      };

      const existingIndex = (state.config.links || []).findIndex(l => l.id === id);
      if (existingIndex >= 0) {
        state.config.links[existingIndex] = payload;
        showToast(`"${name}" actualizado`);
      } else {
        (state.config.links ||= []).push(payload);
        showToast(`"${name}" agregado`);
      }

      persist();
      resetForm();
      renderAll();
    });
  }
}

// Start
boot();
