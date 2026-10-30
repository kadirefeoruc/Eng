'use strict';
const $=id=>document.getElementById(id);
const date=value=>value?new Date(value).toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'}):'—';
async function operation(form,status,fn){if(!form.reportValidity())return;if(!navigator.onLine){$(status).textContent='Bilgilerini güncellemek için internete bağlan.';return;}const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);$(status).textContent='İşlem yapılıyor…';try{$(status).textContent=await fn();}catch(e){$(status).textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}}
(async()=>{const state=await EngAccount.ready;$('global-status').textContent=state.error||'';if(!state.user){$('guest').hidden=false;return;}$('member').hidden=false;const u=state.user,m=u.user_metadata||{};$('member-email').textContent=u.email;$('first-name').value=m.first_name||'';$('last-name').value=m.last_name||'';$('phone').value=m.contact_phone||'';const membership=state.membership;
if(membership?.plan==='admin'){
 $('trial-status').textContent='Yönetici hesabı · Üye yönetimi yetkiniz aktif.';
 $('trial-dates').textContent='';$('continue').hidden=false;
 const shortcut=$('admin-shortcut');if(shortcut)shortcut.hidden=false;
 const link=$('admin-link');if(link)link.hidden=false;
}else if(membership?.configured===false){$('trial-status').textContent='Üyeliğiniz: Deneme Aşamasında';}
else if(membership){
 $('trial-status').textContent=membership.plan==='paid'?'Ücretli üyeliğin aktif.':membership.active?(Number.isFinite(membership.remaining_days)?'1 aylık deneme süresi · '+membership.remaining_days+' gün kaldı.':'Üyeliğiniz: Deneme Aşamasında'):'Deneme süren sona erdi.';
 const dates=[];if(membership.trial_started_at)dates.push('Deneme başlangıcı: '+date(membership.trial_started_at));if(membership.trial_ends_at)dates.push('Bitiş: '+date(membership.trial_ends_at));if(membership.paid_until)dates.push('Ücretli erişim sonu: '+date(membership.paid_until));$('trial-dates').textContent=dates.join(' · ');$('continue').hidden=!membership.active;
}else $('trial-status').textContent='Üyelik durumu şu anda doğrulanamıyor.';
})();
$('login').onsubmit=e=>{e.preventDefault();operation($('login'),'login-status',async()=>{await EngAccount.signIn($('login-email').value.trim(),$('login-password').value);return 'Giriş yapılıyor…';});};
$('profile').onsubmit=e=>{e.preventDefault();operation($('profile'),'profile-status',async()=>{await EngAccount.updateProfile($('first-name').value,$('last-name').value,$('phone').value);return 'Kişisel bilgilerin güncellendi.';});};
$('change-email').onsubmit=e=>{e.preventDefault();operation($('change-email'),'email-status',async()=>{await EngAccount.updateEmail($('new-email').value.trim(),$('email-current-password').value);$('email-current-password').value='';return 'Doğrulama e-postalarını kontrol et. Onay tamamlanana kadar mevcut e-postanla giriş yap.';});};
$('change-password').onsubmit=e=>{e.preventDefault();operation($('change-password'),'password-status',async()=>{if($('new-password').value!==$('repeat-password').value)throw Error('Yeni şifreler eşleşmiyor.');await EngAccount.updatePassword($('current-password').value,$('new-password').value);$('change-password').reset();return 'Şifren güncellendi.';});};
$('logout').onclick=()=>EngAccount.signOut();

