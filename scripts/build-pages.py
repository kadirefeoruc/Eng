from pathlib import Path
import tarfile,hashlib,json,re,shutil
root=Path(__file__).resolve().parents[1]
dest=root/'_site';shutil.rmtree(dest,ignore_errors=True);shutil.copytree(root/'site',dest)
base='/Eng'
prefixes='|'.join(re.escape(n) for n in sorted([p.name for p in dest.iterdir()]+['api','signin-with-chatgpt','lesson'],key=len,reverse=True))
pattern=re.compile(r'''(["'`])/(?=(?:'''+prefixes+r''')(?:[/?."'`]|$))''')
for p in dest.rglob('*'):
 if not p.is_file() or p.suffix not in ['.html','.js','.json','.css','.webmanifest']:continue
 s=p.read_text()
 if p.name=='account.js':
  s=s.replace('a[href^="/signin-with-chatgpt"]','a[href^="/signin-with-chatgpt"],a[href="/account/"]')
  s=s.replace("a.textContent='Giriş yap'","a.textContent=session?'Hesabım':'Giriş yap'")
  s=s.replace("if(url.pathname!=='/api/records')return native(input,options);", "if(url.pathname==='/api/conversation')return json({ready:false,signedIn:!!session,error:'Canlı AI için güvenli sunucu bağlantısı gerekiyor.'});if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/records')return json({error:'Canlı AI için güvenli sunucu bağlantısı gerekiyor.'},503);if(url.pathname!=='/api/records')return native(input,options);")
 if p.parent.name=='lessons' and p.suffix=='.html':
  s=s.replace('<button class="header-btn" id="retry-save">Tekrar bağlan</button>','')
  s=s.replace("document.getElementById('start-lesson-exam').onclick=()=>startLessonExam(false);","document.getElementById('start-lesson-exam').onclick=()=>{const previous=examAttempts[examSelect.value];if(previous&&previous.index>=10&&!confirm('Bu ders sınavını daha önce tamamladın. Tekrar çözmek ister misin?'))return;startLessonExam(false)};")
  s=s.replace("document.getElementById('retry-save').onclick=()=>loaded?flushWrites():loadRecords();", """let retryingRecords=false;
async function retryRecordsAutomatically(){
 if(!navigator.onLine||retryingRecords)return;
 if(loaded&&!pendingWrites.size)return;
 retryingRecords=true;
 try{if(loaded){saveQueue=saveQueue.then(flushWrites).catch(()=>{});await saveQueue}else await loadRecords()}finally{retryingRecords=false}
}
window.addEventListener('online',retryRecordsAutomatically);
setInterval(retryRecordsAutomatically,30000);""")
  s=s.replace('Kaydedilemedi. Seçimlerin bu açık sayfada korunuyor; “Tekrar bağlan”a bas.','Kaydedilemedi. Bağlantı otomatik olarak yeniden denenecek.')
  s=s.replace('Ders değişmeden önce kayıtlarını göndermemiz gerekiyor. Tekrar bağlan düğmesini kullan.','Ders değişmeden önce kayıtların gönderilmesi gerekiyor. Bağlantı otomatik olarak yeniden denenecek.')
  # Ders tamamlandı işareti yalnızca zor okuma metninde gösterilir.
  completion_panel="for(const panel of ['read','listen']){"
  completion_level="stopSpeech();applyPassageData(level);currentNote=null;lastSentence=0;"
  completion_guard="if(!loaded){renderCompletions();return;}"
  assert completion_panel in s and completion_level in s and completion_guard in s, f'Missing completion controls in {p}'
  s=s.replace(completion_panel, """function syncCompletionVisibility(){document.querySelectorAll('.course-completion').forEach(card=>{const show=activeLevel==='hard';card.hidden=!show;card.style.display=show?'':'none';const input=card.querySelector('[data-complete-lesson]');if(input)input.disabled=!loaded||!show;});}
for(const panel of ['read']){""")
  s=s.replace(completion_level,completion_level+"syncCompletionVisibility();")
  s=s.replace(completion_guard,"if(!loaded||activeLevel!=='hard'){renderCompletions();syncCompletionVisibility();return;}")
  s=s.replace("renderCompletions();\n\n// The exam is separate","renderCompletions();syncCompletionVisibility();\n\n// The exam is separate")
  s=s.replace('Henüz tamamladığın ders yok. Okuma veya Dinleme sayfasının sonundaki “Bu dersi tamamladım” kutusunu işaretle.','Henüz tamamladığın ders yok. Okuma bölümünde zor metnin sonundaki “Bu dersi tamamladım” kutusunu işaretle.')
 s=pattern.sub(lambda m:m[1]+base+'/',s)
 s=re.sub(r'href="/Eng/signin-with-chatgpt[^"]*"','href="/Eng/account/"',s)
 s=s.replace(r'^\/lessons\/',r'^\/Eng\/lessons\/')
 s=s.replace("scope:'/'","scope:'/Eng/'").replace("getRegistration('/')","getRegistration('/Eng/')")
 s=s.replace("url.pathname==='/'","url.pathname==='/Eng/'")
 if p.suffix=='.webmanifest':
  obj=json.loads(s);obj['start_url']='/Eng/home/';obj['scope']='/Eng/';s=json.dumps(obj,ensure_ascii=False)
 if p.name=='sw.js':
  s=s.replace('english-offline-shell-v7','eng-pages-shell-v29').replace('english-offline-lesson-','eng-pages-lesson-')
  s=s.replace("const allowed=","const allowed=url.pathname.startsWith('/Eng/account')||")
 if p.name=='app.js' and p.parent.name=='offline':s=s.replace('english-offline-lesson-','eng-pages-lesson-')
 p.write_text(s)
(dest/'index.html').write_text('<!doctype html><html lang="tr"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./home/"><title>İngilizce Eğitim</title><a href="./home/">Platformu aç</a></html>')
(dest/'lesson').mkdir(exist_ok=True)
(dest/'lesson/index.html').write_text('''<!doctype html><meta charset="utf-8"><title>Ders açılıyor</title><script>const id=new URLSearchParams(location.search).get('lesson')||'1';location.replace('/Eng/lessons/'+(/^(?:[1-9]|[1-4][0-9]|50)$/.test(id)?id:'1')+'.html'+location.hash)</script>''')
(dest/'.nojekyll').touch()
print('Built GitHub Pages:',sum(1 for p in dest.rglob('*') if p.is_file()),'files')


