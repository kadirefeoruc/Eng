# İngilizce Eğitim

GitHub Pages: https://kadirefeoruc.github.io/Eng/

50 temalı İngilizce okuma ve dinleme, gramer anlatımları, kelime takibi, ders sınavları ve YDS/YÖKDİL denemeleri. Hesaplar ve kullanıcıya özel ilerleme Supabase ile yönetilir. Giriş e-posta ve şifreyledir.

## Yayın

GitHub Pages kaynağı GitHub Actions olmalıdır. `main` güncellendiğinde `.github/workflows/pages.yml` platformu yayımlar. İlk çalıştırmada `manifests/` içindeki SHA-256 listesine göre varlıklar mevcut kamuya açık siteden doğrulanarak alınır ve `site/` dizinine commit edilir. Sonraki çalıştırmalarda dosyalar zaten depodadır; kaynak sitenin açık kalması gerekmez.

İçeriği `site/` altında düzenleyin. Derleme `scripts/build-pages.py` ile bağlantıları `/Eng/` kapsamına uyarlar ve `_site/` üretir. İlk aktarım `site/.import-complete` işaretiyle tamamlanır. Sonraki yayınlarda dış kaynaktan indirme yapılmaz; `site/` içindeki düzenlemeler doğrudan yayımlanır.

## Üyelik

Yeni üyeler `/Eng/account/` sayfasından e-posta ve şifreyle kaydolur. E-posta doğrulaması açıktır. Supabase Authentication → URL Configuration içinde Site URL `https://kadirefeoruc.github.io/Eng/` ve izinli dönüş adresi `https://kadirefeoruc.github.io/Eng/account/` olmalıdır. Authentication → Users bölümünden kullanıcılar yönetilir. Hiçbir gizli Supabase veya OpenAI anahtarı depoya konulmamalıdır.

Kayıtlar Supabase `lesson_progress` tablosunda kullanıcıya özel RLS kurallarıyla saklanır. Eski ChatGPT hesabı kayıtları otomatik aktarılmaz. Tarayıcıdaki çevrimdışı paketler yeni alan adı için yeniden indirilmelidir.

GitHub Pages sunucu kodu çalıştırmaz. Canlı AI öğretmen ve AI kelime koçu ayrıca güvenli sunucu bağlantısı gerektirir; hazır metinler, sesler ve testler bu gereksinimden bağımsızdır.
