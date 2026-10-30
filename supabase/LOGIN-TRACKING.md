# Giriş sayısını etkinleştirme

Önceki admin kurulumu korunur. `eng-admin` Edge Function kodunu yeniden yayınlamak gerekmez.

1. KEO projesinde SQL Editor > New query açın.
2. `migrations/20261030_login_tracking.sql` dosyasının tamamını yapıştırıp Run'a basın.
3. `Giriş sayısı takibi etkinleştirildi` sonucundan sonra yönetici panelindeki Listeyi yenile düğmesine basın.

Panel: https://kadirefeoruc.github.io/Eng/account/admin.html

Giriş sayısı, güncellemeden sonra platformda kullanılan farklı Supabase oturumlarını sayar. İlk kez görülen mevcut bir oturum da bir giriş sayılır. Sayfa yenileme, aynı oturumla farklı sekmeler ve erişim belirteci yenilemesi sayıyı artırmaz. Çıkış yapıp yeni oturumla giriş yapmak yeni giriş sayılır. Geçmiş girişlerin toplamı yeniden oluşturulmaz. Veritabanı Supabase'in doğruladığı session_id ve kullanıcı kimliğini esas alır; kullanıcı kendi sayısını elle değiştiremez.

SQL uygulanana kadar panel Giriş sayısı sütununda Kurulum gerekli gösterir. Üye ekleme/yönetme ve mevcut aktif süre ölçümü çalışmaya devam eder. Aktif süre yaklaşık ölçümdür; görünür sayfadaki son iki dakikalık etkileşim veya ses oynatma sırasında, çevrim içi olarak toplanır.
