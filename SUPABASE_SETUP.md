# İngilizce Eğitim – Supabase hesap bağlantısı

Canlı üyelik: https://ingilizce-egitim-dersleri.kefeorc.chatgpt.site/account/

Bu commit hesap bağlantısı modülünü ve testini içerir. Tam platformun GitHub yayını henüz kurulmamıştır.

Yeni üyeler canlı sitedeki Üye ol / Giriş yap ekranından kayıt olur. E-posta doğrulaması gerekir. Supabase Authentication > Users üzerinden üyeler yönetilir. Authentication > URL Configuration altında Site URL canlı site adresi olmalıdır.

Kayıtlar kullanıcıya özel RLS korumalı lesson_progress tablosunda, lesson_id anahtarı ve position.value yükü ile saklanır. Kelime detayları, ders ve sınav durumları mevcut veri biçimiyle korunur. Önceki ChatGPT girişine ait kayıtlar otomatik aktarılmaz.
