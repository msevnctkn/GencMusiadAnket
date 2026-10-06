(() => {
  const cfg = window.APP_CONFIG || {};
  const loading = document.getElementById("loading");
  const form = document.getElementById("form");
  const result = document.getElementById("result");
  const responseEl = document.getElementById("response");

  function show(message, isError=false) {
    loading.classList.add("hidden");
    form.classList.add("hidden");
    result.textContent = message;
    result.classList.remove("hidden");
    result.style.borderColor = isError ? "#f1b9bb" : "";
    result.style.background = isError ? "#fff7f7" : "";
  }

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    show("Sistem bağlantısı yüklenemedi. Lütfen sayfayı yenileyin.", true);
    return;
  }

  const token = new URLSearchParams(location.search).get("t");
  if (!token) {
    show("Bu form kişiye özel bağlantı üzerinden kullanılabilir.", true);
    return;
  }

  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);

  async function init() {
    try {
      const { data, error } = await sb.rpc("check_invite", { p_token: token });
      if (error) throw error;
      if (!data || data.length === 0) {
        show("Bağlantı geçersiz veya artık aktif değil.", true);
        return;
      }
      if (data[0].submitted) {
        show("Bu bağlantı üzerinden görüş daha önce gönderilmiş. Teşekkür ederiz.");
        return;
      }
      loading.classList.add("hidden");
      result.classList.add("hidden");
      form.classList.remove("hidden");
    } catch (err) {
      console.error("check_invite:", err);
      show("Bağlantı doğrulanamadı. Lütfen daha sonra tekrar deneyin.", true);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = responseEl.value.trim();
    const visibility = "public";
    if (!text) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Gönderiliyor…";

    try {
      const { data, error } = await sb.rpc("submit_response", {
        p_token: token,
        p_response_text: text,
        p_visibility: visibility
      });
      if (error) throw error;
      if (data !== true) {
        show("Görüş gönderilemedi. Bağlantı daha önce kullanılmış olabilir.", true);
        return;
      }
      show("Görüşünüz başarıyla iletildi. Teşekkür ederiz.");
    } catch (err) {
      console.error("submit_response:", err);
      result.textContent = "Gönderim sırasında bir hata oluştu. Lütfen tekrar deneyin.";
      result.classList.remove("hidden");
      result.style.borderColor = "#f1b9bb";
      result.style.background = "#fff7f7";
      btn.disabled = false;
      btn.textContent = "Görüşümü Gönder";
    }
  });

  init();
})();