/* PAKO OS — authenticated cloud sync (no secret keys in client) */
(function () {
  "use strict";

  const API = "https://diqbmyqvuyollvlvjniz.supabase.co";
  const KEY = "sb_publishable_R_XGqN5PlehELFz7u3fgeg_ekGPb38Z";
  const SESSION_KEY = "pako_os_auth_session_v1";
  const DRAFT_KEY = "pako_os_pending_cloud_v1";
  const LOCAL_CONFIG_KEY = "pako_os_config_v2";
  const LOCAL_LINKS_KEY = "pako_os_links_v2";

  let session = null;
  let userId = null;
  let cloudRevision = null;
  let cloudBase = null;
  let handlers = null;
  let pending = null;
  let pendingSeq = 0;
  let saving = false;
  let ready = false;
  let retryTimer = null;
  let refreshPromise = null;

  function copy(obj) { return JSON.parse(JSON.stringify(obj)); }
  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function localSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.warn("Storage:", err); }
  }
  function localGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (_) { return null; }
  }
  function localRemove(key) { try { localStorage.removeItem(key); } catch (_) {} }
  function status(text, kind) {
    const el = document.getElementById("cloudStatusBtn");
    if (el) {
      el.dataset.status = kind || "pending";
      const label = el.querySelector(".cloud-status-text");
      if (label) label.textContent = text;
      el.title = text;
    }
    const hint = document.getElementById("cloudAccountHint");
    if (hint) hint.textContent = userId ? "Sesión activa · los cambios se guardan en Supabase" : "Tu cuenta mantiene los favoritos sincronizados entre dispositivos.";
    const logout = document.getElementById("cloudLogoutBtn");
    if (logout) logout.hidden = !userId;
    const loginForm = document.getElementById("cloudLoginForm");
    if (loginForm) loginForm.hidden = !!userId;
  }
  function errorMessage(err) {
    const s = err && err.message ? err.message : String(err || "Error desconocido");
    if (/Invalid login credentials/i.test(s)) return "Correo o contraseña incorrectos.";
    if (/Failed to fetch|NetworkError|Load failed/i.test(s)) return "No hay conexión. Revisa internet y vuelve a intentar.";
    return s;
  }
  function showLogin(msg) {
    const modal = document.getElementById("cloudLoginDialog");
    const message = document.getElementById("cloudError");
    if (message) message.textContent = msg || "";
    if (modal && !modal.open) modal.showModal();
  }
  function closeLogin() {
    const modal = document.getElementById("cloudLoginDialog");
    if (modal && modal.open) modal.close();
  }

  async function call(path, options) {
    const config = options || {};
    const headers = Object.assign({ apikey: KEY }, config.headers || {});
    if (config.body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(API + path, {
      method: config.method || "GET",
      headers,
      body: config.body === undefined ? undefined : JSON.stringify(config.body),
      cache: "no-store"
    });
    if (!response.ok) {
      let detail = "";
      try { const body = await response.json(); detail = body.message || body.msg || body.error_description || body.error || body.code || ""; } catch (_) {}
      const err = new Error(detail || "Servicio no disponible (" + response.status + ")");
      err.status = response.status;
      throw err;
    }
    if (response.status === 204) return null;
    return response.json();
  }

  function updateSession(data) {
    if (!data || !data.access_token || !data.refresh_token) throw new Error("No se recibió una sesión válida.");
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
    };
    localSet(SESSION_KEY, session);
  }
  async function ensureToken(force) {
    if (!session) throw new Error("Inicia sesión para sincronizar.");
    const now = Math.floor(Date.now() / 1000);
    if (!force && session.expires_at > now + 75) return session.access_token;
    if (!refreshPromise) {
      refreshPromise = (async function () {
        const renewed = await call("/auth/v1/token?grant_type=refresh_token", {
          method: "POST",
          body: { refresh_token: session.refresh_token }
        });
        updateSession(renewed);
        return session.access_token;
      })().finally(function () { refreshPromise = null; });
    }
    return refreshPromise;
  }
  async function authorized(path, options) {
    let token = await ensureToken(false);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const opts = Object.assign({}, options || {});
        opts.headers = Object.assign({}, opts.headers || {}, { Authorization: "Bearer " + token });
        return await call(path, opts);
      } catch (err) {
        if (err.status !== 401 || attempt > 0) throw err;
        token = await ensureToken(true);
      }
    }
  }
  async function getUser() {
    const user = await authorized("/auth/v1/user");
    if (!user || !user.id) throw new Error("No se pudo validar la cuenta.");
    if (String(user.email || "").toLowerCase() !== "pako@sportcstudio.com") {
      const err = new Error("Selecciona la cuenta Google pako@sportcstudio.com.");
      err.status = 403;
      throw err;
    }
    return user;
  }
  function endpoint(suffix) {
    return "/rest/v1/pako_os_workspaces" + (suffix || "");
  }
  async function readWorkspace() {
    const rows = await authorized(endpoint("?owner_id=eq." + encodeURIComponent(userId) + "&select=owner_id,config,revision,updated_at"), {
      headers: { Accept: "application/json" }
    });
    return Array.isArray(rows) ? (rows[0] || null) : null;
  }
  async function createWorkspace(cfg) {
    try {
      const rows = await authorized(endpoint(), {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: { owner_id: userId, config: cfg }
      });
      return Array.isArray(rows) ? rows[0] : rows;
    } catch (err) {
      if (err.status === 409) return readWorkspace();
      throw err;
    }
  }
  async function writeWorkspace(cfg, rev) {
    const rows = await authorized(endpoint("?owner_id=eq." + encodeURIComponent(userId) + "&revision=eq." + rev + "&select=config,revision,updated_at"), {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: { config: cfg, revision: rev + 1, updated_at: new Date().toISOString() }
    });
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  // Three-way merge: changes made on this device are replayed over the newer
  // cloud version if another device saved in the meantime. Unrelated edits stay intact.
  function merge(base, edited, remote) {
    const result = copy(remote);
    const before = new Map((base.links || []).map(function (x) { return [String(x.id), x]; }));
    const current = new Map((edited.links || []).map(function (x) { return [String(x.id), x]; }));
    const latest = new Map((result.links || []).map(function (x) { return [String(x.id), x]; }));
    const ids = new Set(Array.from(before.keys()).concat(Array.from(current.keys())));
    ids.forEach(function (id) {
      const b = before.get(id);
      const c = current.get(id);
      if (!b && c) latest.set(id, copy(c));
      else if (b && !c) latest.delete(id);
      else if (b && c && !same(b, c)) latest.set(id, copy(c));
    });
    result.links = Array.from(latest.values());
    Object.keys(edited).forEach(function (k) {
      if (k === "links") return;
      if (!same(base[k], edited[k])) result[k] = copy(edited[k]);
    });
    return result;
  }

  function syncLocal(cfg) {
    localSet(LOCAL_CONFIG_KEY, cfg);
    localSet(LOCAL_LINKS_KEY, cfg.links || []);
  }
  function applyCloud(cfg) {
    syncLocal(cfg);
    handlers.setConfig(copy(cfg));
  }

  async function openWorkspace() {
    status("Conectando nube…", "saving");
    const originalDraft = localGet(DRAFT_KEY);
    let row = await readWorkspace();
    if (!row) {
      // First login: use the existing favorites (including changes already
      // saved locally) rather than replacing them with an empty account.
      const initial = originalDraft && originalDraft.ownerId === userId
        ? originalDraft.config : handlers.getConfig();
      row = await createWorkspace(copy(initial));
      if (!row) throw new Error("No se pudo inicializar la copia de seguridad.");
    }
    cloudBase = copy(row.config);
    cloudRevision = Number(row.revision);
    ready = true;
    const unresolved = originalDraft && originalDraft.ownerId === userId ? originalDraft : null;
    if (unresolved) {
      const candidate = merge(unresolved.base || row.config, unresolved.config, row.config);
      applyCloud(candidate);
      queueSave(candidate);
    } else {
      if (!same(handlers.getConfig(), row.config)) {
        const previous = handlers.getConfig();
        localSet("pako_os_precloud_backup_v1", previous);
      }
      applyCloud(row.config);
      localRemove(DRAFT_KEY);
      status("Guardado en nube", "ok");
    }
    closeLogin();
  }

  function scheduleSave(delay) {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(function () {
      retryTimer = null;
      flush().catch(function (err) { console.warn("PAKO OS sync", errorMessage(err)); });
    }, delay);
  }
  function queueSave(cfg) {
    if (!ready || !userId || !cloudBase) {
      status("Inicia sesión", "pending");
      showLogin("Inicia sesión para guardar tus cambios en todos tus dispositivos.");
      return false;
    }
    pending = {
      ownerId: userId, seq: ++pendingSeq,
      base: copy(cloudBase), config: copy(cfg),
      queuedAt: new Date().toISOString()
    };
    localSet(DRAFT_KEY, pending);
    syncLocal(cfg);
    status("Guardando…", "saving");
    scheduleSave(180);
    return true;
  }
  async function flush() {
    if (saving || !ready || !userId || !pending) return;
    saving = true;
    try {
      let attempts = 0;
      while (pending && attempts < 5) {
        attempts++;
        const draft = pending;
        const toSave = merge(draft.base, draft.config, cloudBase);
        const updated = await writeWorkspace(toSave, cloudRevision);
        if (!updated) {
          const row = await readWorkspace();
          if (!row) throw new Error("No se encontró la copia de la nube.");
          cloudBase = copy(row.config);
          cloudRevision = Number(row.revision);
          continue;
        }
        cloudBase = copy(updated.config);
        cloudRevision = Number(updated.revision);
        if (pending === draft) {
          pending = null;
          localRemove(DRAFT_KEY);
          applyCloud(updated.config);
          status("Guardado en nube", "ok");
        }
      }
      if (pending) {
        status("Sincronización pendiente", "pending");
        scheduleSave(2000);
      }
    } catch (err) {
      status("Sin conexión · guardado pendiente", "pending");
      console.warn("Error guardando PAKO OS:", errorMessage(err));
      scheduleSave(15000);
    } finally {
      saving = false;
    }
  }

  async function pullIfNew() {
    if (!ready || !userId || saving || document.hidden) return;
    try {
      const row = await readWorkspace();
      if (!row || Number(row.revision) <= cloudRevision) return;
      cloudBase = copy(row.config);
      cloudRevision = Number(row.revision);
      if (pending) {
        status("Actualizando cambios…", "saving");
        scheduleSave(0);
      } else {
        applyCloud(row.config);
        status("Actualizado entre dispositivos", "ok");
      }
    } catch (err) {
      if (pending) status("Sin conexión · guardado pendiente", "pending");
    }
  }

  function loginWithGoogle() {
    const el = document.getElementById("cloudGoogleBtn");
    if (el) { el.disabled = true; el.textContent = "Conectando con Google…"; }
    const redirect = new URL("/", location.origin).href;
    const authorize = API + "/auth/v1/authorize?" + new URLSearchParams({
      provider: "google", redirect_to: redirect
    }).toString();
    location.assign(authorize);
  }

  function consumeAuthCallback() {
    // Supabase OAuth (implicit flow) returns short-lived credentials after
    // Google consent. Immediately remove them from the visible URL.
    const hash = location.hash && location.hash.charAt(0) === "#"
      ? new URLSearchParams(location.hash.slice(1)) : null;
    if (!hash) return null;
    const error = hash.get("error_description") || hash.get("error");
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (!error && !access) return null;
    history.replaceState(null, "", location.pathname + location.search);
    if (error) return decodeURIComponent(error.replace(/\+/g, " "));
    if (!access || !refresh) return "Google no devolvió una sesión completa.";
    try {
      updateSession({
        access_token: access,
        refresh_token: refresh,
        expires_in: Number(hash.get("expires_in") || 3600)
      });
      return null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  async function restoreSession() {
    const authError = consumeAuthCallback();
    session = localGet(SESSION_KEY);
    if (authError) {
      status("Acceso pendiente", "pending");
      showLogin(authError);
      return;
    }
    if (!session) {
      status("Activar nube", "pending");
      return;
    }
    try {
      const user = await getUser();
      userId = user.id;
      await openWorkspace();
    } catch (err) {
      // Don't destroy credentials or pending work for transient network errors.
      if (err.status === 401 || err.status === 403 || /refresh token|invalid jwt/i.test(errorMessage(err))) {
        session = null;
        userId = null;
        localRemove(SESSION_KEY);
        ready = false;
        status("Volver a entrar", "pending");
        if (err.status === 403) showLogin(errorMessage(err));
      } else {
        status("Nube temporalmente inaccesible", "pending");
      }
    }
  }
  async function logout() {
    if (pending) await flush();
    if (pending) {
      status("Guarda antes de salir", "pending");
      showLogin("Hay cambios pendientes. Comprueba tu conexión antes de cerrar la sesión.");
      return;
    }
    try { if (session) await authorized("/auth/v1/logout", { method: "POST" }); } catch (_) {}
    session = null; userId = null; ready = false;
    cloudBase = null; cloudRevision = null; pending = null;
    localRemove(SESSION_KEY); localRemove(DRAFT_KEY);
    localRemove(LOCAL_CONFIG_KEY); localRemove(LOCAL_LINKS_KEY);
    applyCloud(copy(handlers.baseConfig));
    status("Activar nube", "pending");
    closeLogin();
  }
  function canEdit() { return Boolean(userId && ready); }
  async function init(config) {
    handlers = config;
    const googleButton = document.getElementById("cloudGoogleBtn");
    const statusButton = document.getElementById("cloudStatusBtn");
    const logoutButton = document.getElementById("cloudLogoutBtn");
    const closeButton = document.getElementById("cloudCloseBtn");
    if (googleButton) googleButton.addEventListener("click", loginWithGoogle);
    if (closeButton) closeButton.addEventListener("click", closeLogin);
    if (statusButton) statusButton.addEventListener("click", function () { showLogin(); });
    if (logoutButton) logoutButton.addEventListener("click", logout);
    window.addEventListener("online", function () { if (pending) scheduleSave(0); else if (session && !ready) restoreSession(); else pullIfNew(); });
    window.addEventListener("focus", function () { if (session && !ready) restoreSession(); else pullIfNew(); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) { if (pending) scheduleSave(0); else pullIfNew(); } });
    setInterval(pullIfNew, 30000);
    await restoreSession();
  }
  window.PakoCloud = {
    init: init,
    canEdit: canEdit,
    loginDialog: showLogin,
    queueSave: queueSave,
    flush: flush
  };
})();
