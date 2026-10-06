(() => {
  const cfg = window.APP_CONFIG || {};
  const loginCard = document.getElementById("loginCard");
  const panel = document.getElementById("panel");
  const loginBtn = document.getElementById("login");
  const logoutBtn = document.getElementById("logout");
  const loginMsg = document.getElementById("loginMsg");
  const tbody = document.getElementById("rows");
  const search = document.getElementById("search");
  const filter = document.getElementById("filter");
  const csvBtn = document.getElementById("csv");
  let report = [];

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    loginMsg.textContent = "Sistem bağlantısı yüklenemedi.";
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[c]);
  }
  function fmtDate(v) {
    if (!v) return "—";
    return new Intl.DateTimeFormat("tr-TR", {dateStyle:"medium", timeStyle:"short"}).format(new Date(v));
  }
  function visibleRows() {
    const q = search.value.trim().toLocaleLowerCase("tr-TR");
    const f = filter.value;
    return report.filter(r => {
      const answered = !!r.response_text;
      if (f === "answered" && !answered) return false;
      if (f === "pending" && answered) return false;
      if (f === "anonymous" && r.visibility !== "anonymous") return false;
      const hay = `${r.full_name ?? ""} ${r.response_text ?? ""}`.toLocaleLowerCase("tr-TR");
      return !q || hay.includes(q);
    });
  }
  function render() {
    const rows = visibleRows();
    tbody.innerHTML = rows.map(r => `<tr>
      <td><strong>${esc(r.full_name)}</strong></td>
      <td>${r.response_text ? esc(r.response_text) : '<span style="color:#8a96a3">Henüz cevap yok</span>'}</td>
      <td>${r.response_text ? (r.visibility === "anonymous" ? "Anonim" : "İsimle") : "—"}</td>
      <td>${fmtDate(r.submitted_at)}</td>
    </tr>`).join("");
  }
  function stats() {
    const total = report.length;
    const answered = report.filter(r => r.response_text).length;
    document.getElementById("total").textContent = total;
    document.getElementById("answered").textContent = answered;
    document.getElementById("pending").textContent = total - answered;
    document.getElementById("rate").textContent = total ? `${Math.round(answered/total*100)}%` : "0%";
  }
  async function loadReport() {
    const { data, error } = await sb.rpc("admin_response_report");
    if (error) throw error;
    report = data || [];
    stats(); render();
  }
  async function showPanel() {
    const { data, error } = await sb.rpc("is_admin");
    if (error || data !== true) {
      await sb.auth.signOut();
      loginCard.classList.remove("hidden");
      panel.classList.add("hidden");
      loginMsg.textContent = "Bu hesap yönetici olarak yetkilendirilmemiş.";
      return;
    }
    loginCard.classList.add("hidden");
    panel.classList.remove("hidden");
    try { await loadReport(); }
    catch (e) { console.error(e); alert("Rapor yüklenemedi."); }
  }

  loginBtn.addEventListener("click", async () => {
    loginMsg.textContent = "";
    loginBtn.disabled = true;
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    loginBtn.disabled = false;
    if (error) { loginMsg.textContent = "E-posta veya şifre hatalı."; return; }
    await showPanel();
  });
  logoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    panel.classList.add("hidden");
    loginCard.classList.remove("hidden");
  });
  search.addEventListener("input", render);
  filter.addEventListener("change", render);
  csvBtn.addEventListener("click", () => {
    const rows = visibleRows();
    const quote = v => `"${String(v ?? "").replaceAll('"','""')}"`;
    const csv = "\ufeff" + [
      ["Üye","Görüş","Paylaşım","Gönderim"].map(quote).join(";"),
      ...rows.map(r => [r.full_name,r.response_text,r.visibility === "anonymous" ? "Anonim" : (r.response_text ? "İsimle" : ""),r.submitted_at ? fmtDate(r.submitted_at) : ""].map(quote).join(";"))
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    a.download = "genc-musiad-anket-raporu.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  sb.auth.getSession().then(({data}) => {
    if (data.session) showPanel();
  });
})();