# Üyelik ve ücretli erişimin durumu

GitHub Pages güncellemesi normal sayfa gezinmesinde giriş ister. Supabase Auth sunucusundan kullanıcı doğrulanır. Profil adı, soyadı ve iletişim telefonu kullanıcı metadatasında; kimlik e-postası ve şifre Supabase Auth içinde tutulur. E-posta/şifre değiştirmek için mevcut şifreyle tekrar doğrulama yapılır. Telefon alanı SMS ile doğrulanmış bir giriş numarası değildir.

## 1. Deneme süresini etkinleştirme

`supabase/migrations/20261026_membership.sql` dosyasını proje sahibi Supabase SQL Editor'de çalıştırmalıdır. Açık istemci anahtarı bu SQL'i çalıştıramaz. Süre, kurulumdan sonra üyenin ilk üyelik kontrolünde sunucu saatiyle başlar ve bir takvim ayı sürer. Mevcut hesaplar da ilk kontrolünde süre alır. Üye kendi başlangıç, bitiş veya ücretli erişim tarihini değiştiremez. SQL kurulana kadar arayüz denemenin henüz etkinleştirilmediğini söyler ve doğrulanmış kullanıcıların mevcut erişimini sürdürür.

## 2. Gerçek içerik koruması için tamamlanması gerekenler

GitHub Pages dosyaları ve mevcut açık GitHub deposu herkese açıktır. Arayüz giriş kontrolü; kaynak HTML'yi, ses URL'lerini, açık Git geçmişini veya önceden indirilmiş kopyaları gizlemez. Bu sürüm güvenli bir ücretli içerik duvarı olarak pazarlanmamalıdır.

Ders, ses ve soru bankaları özel `eng-course-private` Supabase Storage alanına yönetici tarafından yüklenmeli; GitHub Pages çıktısından ve açık depodan kaldırılmalıdır. Sunucu veya RLS kontrollü erişim, yalnızca geçerli Supabase oturumu ve `has_course_access()` sonucu ile dosya vermelidir. Git geçmişindeki eski içerik zaten kamuya açılmıştır; gelecekteki özel içerik Git'e konulmamalıdır. Bu taşıma mevcut sürümde yapılmamıştır. Yayındaki dersler bu yüzden doğrudan dosya adreslerinden hâlâ erişilebilirdir.

Çevrimdışı olarak önceden teslim edilmiş dosyaları sonradan geri almak garanti edilemez. Ücretli model için çevrimdışı erişim süresi ve yeniden doğrulama politikası ayrıca belirlenmelidir.

## 3. Ödeme

Şu anda tahsilat, ödeme sağlayıcısı veya otomatik ücretli üyelik etkinleştirme yoktur. Önerilen model: kart istemeden bir ay deneme, ardından kullanıcının açık tercihiyle aylık veya yıllık üyelik. Ödeme sağlayıcısının barındırdığı ödeme sayfası kullanılmalı; kart numarası platforma alınmamalıdır. Sunucudaki imzası doğrulanmış ve tekrarlı bildirimlere dayanıklı ödeme webhook'u `paid_until` alanını günceller. Tarayıcıdaki başarı sayfası veya kullanıcı metadatası ödeme kanıtı değildir. İptal, iade ve başarısız yenileme durumları da sunucudan işlenir.

Ücret, işletme/üye işyeri hesabı ve sağlayıcı seçimi bekleniyor. Güvenli özel dosya teslimi tamamlanmadan ödeme alınmamalıdır.

## 4. E-posta

E-posta değişiklik onayları ve yeni üyelik e-postaları için özel SMTP gerekir. Site URL ve izinli dönüş adresleri GitHub Pages alanına göre ayarlanmalıdır. Kullanıcının şifresi veya gizli servis anahtarı sohbete ya da açık depoya yazılmamalıdır.
