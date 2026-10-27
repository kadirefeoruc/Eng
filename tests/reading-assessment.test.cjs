const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.classList={add(){},remove(){}};this.textContent='';this.paused=true;}
 set innerHTML(x){this.parts={'#rq-body':new Element()}}
 querySelector(x){return this.parts?.[x]||null}closest(){return this}
 insertAdjacentElement(x,e){root=e}append(...x){this.children.push(...x)}replaceChildren(){this.children=[]}setAttribute(){}
 play(){this.paused=false;this.onplay?.();return Promise.resolve()}
 pause(){this.paused=true;this.onpause?.()}load(){this.error=null}
}
let root;const els={'word-card':new Element(),'dock-open':new Element(),'teacher-details':new Element()};
const ctx={document:{createElement:t=>new Element(t),createTextNode:t=>({textContent:t}),querySelector:s=>s==='#reading-assessment'?null:new Element(),querySelectorAll:()=>[],getElementById:id=>els[id]||(els[id]=new Element()),body:new Element()},window:{},dock:new Element(),activeLevel:'easy',selectPassage(){},pauseAudio(){},cancelAudio(){},words:[],loaded:true,lemma:w=>w.toLowerCase(),wordDefinition:()=>null,lessonMeta:{number:1},save(){},fetch(){throw Error('Unexpected network lookup')}};
let source=fs.readFileSync(process.env.QUIZ_SOURCE||'site/platform/reading-assessment.js','utf8').replace('const originalSelectPassage=','globalThis.testApi={data,quizTranslations,quizLexicon,openQuizWord};const originalSelectPassage=');
vm.createContext(ctx);vm.runInContext(source,ctx);
const flatten=e=>(e.textContent||'')+' '+(e.children||[]).map(flatten).join(' ');
const all=e=>[e,...(e.children||[]).flatMap(all)];
const host=()=>root.querySelector('#rq-body');
const click=text=>{const b=all(host()).find(e=>e.tag==='button'&&e.textContent===text);assert(b,text);assert(!b.disabled);b.onclick()};
const choose=value=>{const radio=all(host()).find(e=>e.tag==='input'&&e.value===value);assert(radio);radio.onchange()};
for(const value of [0,1,0,1,0]){choose(value);click(value===0&&flatten(host()).includes('5. soru')?'Sonuçları göster':'Sonraki soru')}
assert(flatten(host()).includes('3 doğru, 2 yanlış'));
const audio=all(host()).find(e=>e.tag==='audio');assert.equal(audio.src,'/audio/assessment/1/easy-1.mp3');
click('Türkçe açıklamayı dinle');assert.equal(audio.paused,false);assert(flatten(host()).includes('Türkçe açıklama oynatılıyor'));
click('Açıklamayı duraklat');assert.equal(audio.paused,true);
audio.error={code:2};audio.onerror();assert(flatten(host()).includes('Ses yüklenemedi'));
click('Sesi tekrar yükle');assert.equal(audio.error,null);assert.equal(audio.paused,false);
click('Bu hatalı soruyu tekrar cevapla');assert.equal(audio.paused,true);assert(flatten(host()).includes('2. soru'));
choose(1);click('Sonuçları göster');assert(flatten(host()).includes('3 doğru, 2 yanlış'));
click('Hatalı soruları tekrar cevapla');assert(flatten(host()).includes('2. soru'));
choose(0);click('Sonraki soru');assert(flatten(host()).includes('4. soru'));
choose(0);click('Önceki soru');assert.equal(all(host()).find(e=>e.tag==='input'&&e.value===0).checked,true);
click('Sonraki soru');click('Sonuçları göster');assert(flatten(host()).includes('5 doğru, 0 yanlış'));
assert(!all(host()).some(e=>e.textContent==='Hatalı soruları tekrar cevapla'));
ctx.activeLevel='medium';ctx.selectPassage();assert(flatten(host()).includes('1. soru'));
ctx.activeLevel='easy';ctx.selectPassage();assert(flatten(host()).includes('5 doğru, 0 yanlış'));
(async()=>{let count=0;for(const qs of Object.values(ctx.testApi.data)){for(const q of qs){for(const sentence of [q[0],...q[1]]){assert(ctx.testApi.quizTranslations[sentence]);for(const word of sentence.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g)){await ctx.testApi.openQuizWord(word,new Element(),sentence);let text=flatten(els['word-card']);assert(!text.includes('Sözlükte bulunamadı'),word);assert(text.includes(ctx.testApi.quizTranslations[sentence]));count++;}}}}
console.log('PASS: single/multiple wrong-answer retries, repeated wrong answers, preserved correct answers, navigation, level switching, audio controls/error recovery, '+count+' word contexts');
})().catch(e=>{console.error(e);process.exitCode=1});
