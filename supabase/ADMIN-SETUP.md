# Üye yönetimini etkinleştirme

GitHub'daki arayüz tek başına yönetici yetkisi vermez. Aşağıdaki iki işlem KEO projesinde yapılmalıdır.

## 1. Veritabanı

Supabase > KEO > SQL Editor > New query. `migrations/20261029_admin.sql` dosyasının tamamını yapıştırıp Run'a basın. Sonuçta `kadirefeoruc@gmail.com` görünmelidir. Script mevcut doğrulanmış hesabın UUID'sine yetki atar. E-posta veya kullanıcı metadata'sı üzerinden yetki verilmez. Hata olursa işlem geri alınır; hata mesajını kontrol edin.

## 2. Sunucu fonksiyonu

Supabase > Edge Functions > Deploy a new function > Via Editor. Adı tam olarak `eng-admin` olsun. Editördeki index.ts içeriğini `functions/eng-admin/index.ts` dosyasının tamamıyla değiştirip Deploy function'a basın.

Fonksiyonun Details/Settings bölümünde **Verify JWT / Enforce JWT verification** seçeneğini kapatın ve değişikliği kaydedin. Fonksiyon her istekte JWT'yi Supabase Auth `/user` üzerinden kendisi doğrular; ayrıca veritabanındaki admin yetkisini kontrol eder. İmzalı kullanıcı oturumu olmadan işlem yapılmaz. Bu ayar, yeni anahtar/imza türleriyle gateway uyumsuzluğunu önler.

`SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` Supabase Edge Functions'ın varsayılan sunucu ortam değişkenleridir. Bunları GitHub dosyalarına, tarayıcıya veya sohbete yapıştırmayın. Yeni bir gizli anahtar oluşturmak gerekmemektedir.

## 3. Kontrol

https://kadirefeoruc.github.io/Eng/account/admin.html adresini admin hesabıyla açın. Üye listesi yüklenmelidir. Hesabım sayfasında Üye yönetimi bağlantısı da görünür. Liste yüklenmiyorsa hata metni SQL ile fonksiyon aşamalarını ayırmaya yardımcı olur. Normal bir üyenin bu adreste yetki hatası görmesi beklenir.

Yeni üye oluştururken e-posta ve en az 12 karakter şifre girilir. E-posta gönderilmez; hesap admin tarafından doğrulanmış olarak oluşturulur. Üye şifresini Hesabım bölümünden değiştirebilir. Admin hesabı silme, pasife alma ve başka kullanıcı üzerinden şifre değiştirme işlemlerinden korunur. Silme için hedef e-posta aynen yazılmalıdır.

## Ölçümler ve kapsam

- Aktif süre: çevrim içi, görünür sayfada son iki dakikada kullanıcı etkileşimi veya çalan ses. Sunucu zamanıyla 30 saniyelik bildirimlerden yaklaşık hesaplanır. Aynı kullanıcıya ait sekmeler süreyi katlamaz; 60 saniyeden uzun boşluklar sayılmaz. İlk ölçümden önceki saatler hesaplanmaz.
- Tamamlanan ders: mevcut `completion:N` kayıtları. Bir dersin üç metnini ayrı ayrı tamamladığını kanıtlamaz.
- Tam dinlenen metin: okuma/dinleme oynatıcısında sesin en az %90'ı oynatılmış ve sonuna gelinmiş tekil ders/seviye sayısı. Yeni kurulumdan itibaren kaydedilir. Metni yalnızca gözle okumak otomatik olarak tamamlanmış sayılmaz.
- Pasife alma: yeni girişleri ve mevcut JWT ile çevrim içi kişisel veri erişimini kapatır. Zaten indirilmiş GitHub Pages içeriği ve çevrimdışı kopyalar uzaktan geri alınamaz; özel içerik güvenliği için ayrı sunucu/özel depolama gerekir.
- Admin arayüzündeki okuma ve işlem yanıtları cache edilmez; yeni takip tabloları normal üyelere doğrudan açık değildir.

## Doğrulama

`node --test tests/account.test.mjs` ve `node tests/admin-function.test.mjs` GitHub yayın akışında çalışır. Canlı Supabase kurulumu kullanıcı tarafından tamamlanmadan canlı admin işlemleri doğrulanmış sayılmaz.
