# Genç MÜSİAD Anket Sistemi

## Yapı
- index.html: kişiye özel token ile açılan üye formu
- admin.html: yönetici paneli
- app.js / admin.js: uygulama kodları
- styles.css: arayüz
- supabase.sql: veritabanı, RLS ve RPC fonksiyonları
- config.example.js: Supabase URL ve anon key şablonu

## Kurulum
1. Supabase'de yeni proje oluştur.
2. SQL Editor'da `supabase.sql` dosyasını çalıştır.
3. Authentication > Users bölümünden yönetici kullanıcı oluştur.
4. SQL içindeki `ADMIN_EMAIL` alanını yönetici e-posta adresinle değiştirip admin kaydını ekle.
5. `config.example.js` dosyasını `config.js` olarak kopyala.
6. Supabase Project URL ve anon/public key'i `config.js` içine yaz.
7. Dosyaları statik hosting'e yükle (Netlify / Cloudflare Pages / GitHub Pages vb.).
8. Admin paneline `admin.html` üzerinden giriş yap.
9. SQL örneğini kullanarak üyeleri ve kişiye özel tokenları ekle.

Üye link formatı:
`https://SITE-ADRESI/index.html?t=TOKEN`

Not: service_role anahtarı hiçbir frontend dosyasına yazılmamalıdır.
