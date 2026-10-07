(() => {
  const cfg = window.APP_CONFIG || {};
  const $ = s => document.querySelector(s);
  let report = [];
  let selected = new Set();

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    $("#loginMsg").textContent = "Sistem bağlantısı yüklenemedi.";
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
  const fmtDate = v => v ? new Intl.DateTimeFormat("tr-TR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v)) : "—";
  const personalUrl = token => `${location.origin}/?t=${token}`;

  function filteredRows() {
    const q = $("#search").value.trim().toLocaleLowerCase("tr-TR");
    const f = $("#filter").value;
    return report.filter(r => {
      const answered = !!r.submitted_at;
      if (f === "answered" && !answered) return false;
      if (f === "pending" && answered) return false;
      const hay = `${r.full_name ?? ""} ${r.response_text ?? ""}`.toLocaleLowerCase("tr-TR");
      return !q || hay.includes(q);
    });
  }

  function stats() {
    const total = report.length;
    const answered = report.filter(r => r.submitted_at).length;
    $("#total").textContent = total;
    $("#answered").textContent = answered;
    $("#pending").textContent = total - answered;
    $("#rate").textContent = total ? `${Math.round(answered/total*100)}%` : "0%";
  }

  function render() {
    const rows = filteredRows();
    $("#rows").innerHTML = rows.map(r => {
      const url = personalUrl(r.token);
      return `<tr>
        <td class="check-col"><input class="member-check" type="checkbox" data-id="${esc(r.member_id)}" ${selected.has(r.member_id) ? "checked" : ""}></td>
        <td><strong>${esc(r.full_name)}</strong></td>
        <td>${r.response_text ? esc(r.response_text) : '<span style="color:#8a96a3">Henüz cevap yok</span>'}</td>
        <td>${fmtDate(r.submitted_at)}</td>
        <td class="link-cell"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a><button class="copy-link" data-url="${esc(url)}" type="button">Kopyala</button></td>
      </tr>`;
    }).join("");

    document.querySelectorAll(".member-check").forEach(el => el.addEventListener("change", e => {
      e.target.checked ? selected.add(e.target.dataset.id) : selected.delete(e.target.dataset.id);
      syncSelectAll();
    }));
    document.querySelectorAll(".copy-link").forEach(el => el.addEventListener("click", async e => {
      await navigator.clipboard.writeText(e.currentTarget.dataset.url);
      const old=e.currentTarget.textContent; e.currentTarget.textContent="Kopyalandı";
      setTimeout(()=>e.currentTarget.textContent=old,1000);
    }));
    syncSelectAll();
  }

  function syncSelectAll() {
    const visible = filteredRows();
    $("#selectAll").checked = visible.length > 0 && visible.every(r => selected.has(r.member_id));
  }

  async function loadReport() {
    const { data, error } = await sb.rpc("admin_invite_report");
    if (error) throw error;
    report = data || [];
    stats(); render();
  }

  async function showPanel() {
    const { data, error } = await sb.rpc("is_admin");
    if (error || data !== true) {
      await sb.auth.signOut();
      $("#loginCard").classList.remove("hidden");
      $("#panel").classList.add("hidden");
      $("#loginMsg").textContent = "Bu hesap yönetici olarak yetkilendirilmemiş.";
      return;
    }
    $("#loginCard").classList.add("hidden");
    $("#panel").classList.remove("hidden");
    try { await loadReport(); }
    catch(e) { console.error(e); $("#actionMsg").textContent="Rapor yüklenemedi. Önce verilen SQL güncellemesini çalıştırın."; }
  }

  $("#login").addEventListener("click", async () => {
    $("#loginMsg").textContent="";
    const { error } = await sb.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
    if (error) return $("#loginMsg").textContent="E-posta veya şifre hatalı.";
    showPanel();
  });
  $("#logout").addEventListener("click", async()=>{ await sb.auth.signOut(); location.reload(); });
  $("#search").addEventListener("input", render);
  $("#filter").addEventListener("change", render);
  $("#selectAll").addEventListener("change", e => {
    filteredRows().forEach(r => e.target.checked ? selected.add(r.member_id) : selected.delete(r.member_id));
    render();
  });

  $("#renew").addEventListener("click", async () => {
    if (!selected.size) { $("#actionMsg").textContent="Önce en az bir üye seçin."; return; }
    const names = report.filter(r=>selected.has(r.member_id)).map(r=>r.full_name);
    if (!confirm(`${names.length} üyenin mevcut linki geçersiz olacak ve varsa test cevabı silinecek. Yeni link üretmek istiyor musunuz?`)) return;
    $("#renew").disabled=true; $("#actionMsg").textContent="Linkler yenileniyor…";
    const { data, error } = await sb.rpc("renew_member_invites", { p_member_ids:[...selected] });
    $("#renew").disabled=false;
    if (error) { console.error(error); $("#actionMsg").textContent="Linkler yenilenemedi."; return; }
    selected.clear();
    $("#actionMsg").textContent=`${data ?? names.length} üyenin linki yenilendi. Eski linkler artık geçersiz.`;
    await loadReport();
  });

  $("#csv").addEventListener("click", () => {
    const rows=filteredRows();
    const q=v=>`"${String(v??"").replaceAll('"','""')}"`;
    const csv="\ufeff"+[
      ["Üye","Görüş","Gönderim","Kişisel Link"].map(q).join(";"),
      ...rows.map(r=>[r.full_name,r.response_text, r.submitted_at?fmtDate(r.submitted_at):"",personalUrl(r.token)].map(q).join(";"))
    ].join("\n");
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
    a.download="genc-musiad-anket-raporu.csv"; a.click(); URL.revokeObjectURL(a.href);
  });

  sb.auth.getSession().then(({data})=>{ if(data.session) showPanel(); });
})();