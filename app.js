(() => {
  'use strict';

  const STORAGE_KEY = 'cybits-save-v1';
  const VERSION = 1;
  const TICK_MS = 5000;
  const MAX_OFFLINE_MIN = 720;

  const PETS = {
    egg: { name: 'Kernel Egg', stage: 'EGG', grid: [
      '0000000000000000','0000001111000000','0000111111110000','0001111111111000',
      '0011111111111100','0011111111111100','0111111111111110','0111111111111110',
      '0111111111111110','0111111111111110','0011111111111100','0011111111111100',
      '0001111111111000','0000111111110000','0000001111000000','0000000000000000'] },
    bitling: { name:'Bitling', stage:'BITLING', grid:[
      '0000011111100000','0001111111111000','0011111111111100','0111101111011110',
      '0111101111011110','1111111111111111','1111111111111111','1111100001111111',
      '0111110011111110','0011111111111100','0001111111111000','0011011111101100',
      '0110001111000110','1100001111000011','0000011001100000','0000110000110000'] },
    spryte: { name:'Spryte', stage:'SPRITE', grid:[
      '0000001111000000','0000111111110000','0001111111111000','0111111111111110',
      '1110110110110111','1111111111111111','0111111001111110','0011111111111100',
      '0001111111111000','0011111111111100','0110111111110110','1100011111100011',
      '1000011001100001','0000110000110000','0001100000011000','0011000000001100'] },
    glitchling: { name:'Glitchling', stage:'GLITCH', grid:[
      '0100011111100010','0011111111110100','1111111111111111','0111011110111110',
      '1101111111111011','1111100110011111','0111111111111110','1110011111100111',
      '0011111111111100','0101111001111010','1110111111110111','0100011111100010',
      '1000110110110001','0011000110001100','0110001001000110','1000010000100001'] },
    voltusk: { name:'Voltusk', stage:'ADULT', grid:[
      '0010001111000100','0111011111101110','1111111111111111','1110111111110111',
      '1101101111011011','1111111111111111','1111110011111111','0111111111111110',
      '0011111111111100','0111111111111110','1110111111110111','1100011111100011',
      '1100111001110011','1001110000111001','0011100000011100','0110000000000110'] },
    bloombyte: { name:'Bloombyte', stage:'ADULT', grid:[
      '0010011111100100','0111111111111110','1111111111111111','1101111111111011',
      '1110110110110111','1111111111111111','0111111001111110','0011111111111100',
      '0111111111111110','1110111111110111','1100111111110011','1001111111111001',
      '0001111001111000','0011100000011100','0111000000001110','1100000000000011'] },
    noxbit: { name:'Noxbit', stage:'ADULT', grid:[
      '1000011111100001','0101111111111010','1111111111111111','1111011111101111',
      '1110110110110111','1111111111111111','0111100001111110','1111111111111111',
      '1011111111111101','0111111111111110','1100111111110011','1000011111100001',
      '1100110110110011','0101100000011010','1011000000001101','0110000000000110'] }
  };

  const $ = (q) => document.querySelector(q);
  const $$ = (q) => [...document.querySelectorAll(q)];
  const clamp = (v, min=0, max=100) => Math.max(min, Math.min(max, v));
  const now = () => Date.now();
  const minute = 60_000;

  const canvas = $('#petCanvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let menuIndex = 0;
  let trainingTimer = null;
  let state = loadState();

  function newState() {
    const t = now();
    return {
      version: VERSION,
      bornAt: t,
      lastTick: t,
      lastSaved: t,
      petName: 'UNHATCHED',
      form: 'egg',
      hunger: 76,
      happiness: 76,
      strength: 20,
      energy: 96,
      hygiene: 100,
      health: 100,
      weight: 5,
      poop: 0,
      sick: false,
      sleeping: false,
      careMistakes: 0,
      trainingCount: 0,
      feeds: 0,
      battles: 0,
      battleWins: 0,
      battleLosses: 0,
      lastBattle: 0,
      hatchAt: t + 30_000,
      evolved1: false,
      evolved2: false,
      log: [{ at:t, text:'A strange data-egg materialized in your pocket.' }],
      sound: true
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return newState();
      const s = { ...newState(), ...JSON.parse(raw) };
      simulateOffline(s);
      return s;
    } catch (e) {
      console.warn('Could not load save', e);
      return newState();
    }
  }

  function save() {
    state.lastSaved = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function simulateOffline(s) {
    const elapsedMin = Math.min(MAX_OFFLINE_MIN, Math.max(0, (now() - (s.lastTick || now())) / minute));
    if (elapsedMin < .08) return;
    decay(s, elapsedMin, true);
    s.lastTick = now();
    if (elapsedMin > 1) s.log = [{at:now(), text:`${Math.floor(elapsedMin)} min passed while you were away.`}, ...(s.log || [])].slice(0,40);
  }

  function ageMinutes() { return Math.max(0, (now() - state.bornAt) / minute); }
  function gameDay() { return Math.floor(ageMinutes() / 15); }

  function decay(s, mins, offline=false) {
    if (s.form === 'egg') return;
    const sleepFactor = s.sleeping ? .5 : 1;
    s.hunger = clamp(s.hunger - mins * 1.35 * sleepFactor);
    s.happiness = clamp(s.happiness - mins * .52 * sleepFactor);
    s.energy = clamp(s.energy + mins * (s.sleeping ? 4.2 : -.74));
    s.hygiene = clamp(s.hygiene - mins * (.34 + s.poop * .18));

    const lowNeeds = [s.hunger, s.happiness, s.energy, s.hygiene].filter(v => v < 20).length;
    if (lowNeeds) s.health = clamp(s.health - mins * .8 * lowNeeds);
    else s.health = clamp(s.health + mins * .12);

    const newPoops = Math.floor((mins + (s._poopRemainder || 0)) / 12);
    s._poopRemainder = (mins + (s._poopRemainder || 0)) % 12;
    if (newPoops > 0 && !s.sleeping) s.poop = Math.min(4, s.poop + newPoops);

    if (s.hunger <= 5 || s.happiness <= 5 || s.hygiene <= 5) {
      const marker = Math.floor(now() / minute / 5);
      if (s._mistakeMarker !== marker) {
        s.careMistakes++;
        s._mistakeMarker = marker;
      }
    }

    if (!s.sick && (s.hygiene < 15 || s.health < 35) && Math.random() < Math.min(.6, mins * .03)) {
      s.sick = true;
      if (!offline) addLog('Warning: your Cybit developed a data-fever.');
    }
  }

  function addLog(text) {
    state.log = [{ at:now(), text }, ...(state.log || [])].slice(0,40);
    ticker(text);
    save();
  }

  function ticker(text) { $('#ticker').textContent = text; }

  function beep(freq=540, duration=.055) {
    if (!state.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ac = beep.ac || (beep.ac = new AudioCtx());
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type='square'; o.frequency.value=freq; g.gain.value=.035;
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + duration);
    } catch {}
  }

  function hatchCheck() {
    if (state.form === 'egg' && now() >= state.hatchAt) {
      state.form = 'bitling';
      state.petName = 'BITLING';
      state.bornAt = now();
      addLog('The shell cracked—Bitling booted up! Rename it whenever you like.');
      beep(780,.12);
    }
  }

  function evolutionCheck() {
    if (state.form === 'egg') return;
    const age = ageMinutes();
    if (!state.evolved1 && age >= 10) {
      state.evolved1 = true;
      if (state.careMistakes <= 2 && state.trainingCount >= 3) {
        state.form = 'spryte';
        addLog('Evolution! Bitling stabilized into Spryte.');
      } else {
        state.form = 'glitchling';
        addLog('Evolution! Care instability rewired Bitling into Glitchling.');
      }
      beep(860,.16);
    }
    if (!state.evolved2 && age >= 45) {
      state.evolved2 = true;
      if (state.careMistakes >= 5) state.form = 'noxbit';
      else if (state.strength >= 65 && state.trainingCount >= 8) state.form = 'voltusk';
      else state.form = 'bloombyte';
      addLog(`Final evolution achieved: ${PETS[state.form].name}!`);
      beep(940,.18);
    }
  }

  function tick() {
    const t = now();
    const mins = Math.max(0, (t - state.lastTick) / minute);
    state.lastTick = t;
    hatchCheck();
    decay(state, mins);
    evolutionCheck();
    save();
    render();
  }

  function render() {
    hatchCheck();
    evolutionCheck();
    $('#petName').textContent = state.petName;
    $('#stageLabel').textContent = PETS[state.form].stage;
    $('#soundBtn').textContent = state.sound ? 'SFX ON' : 'SFX OFF';
    $('#hungerBar').style.width = `${state.hunger}%`;
    $('#happyBar').style.width = `${state.happiness}%`;
    $('#strengthBar').style.width = `${state.strength}%`;
    $('#energyBar').style.width = `${state.energy}%`;
    const mins = Math.floor(ageMinutes());
    $('#clockLabel').textContent = `DAY ${gameDay()} · ${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
    $('#signalLabel').textContent = state.sick ? 'DATA FEVER!' : state.sleeping ? 'SLEEP MODE' : state.poop ? `${state.poop} WASTE` : 'LINK READY';
    $$('.actions button').forEach((b,i)=>b.classList.toggle('active',i===menuIndex));
    drawPet();
  }

  function drawPet() {
    const W=canvas.width,H=canvas.height;
    ctx.fillStyle='#b7d992'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#91b875';
    for(let x=0;x<W;x+=8) ctx.fillRect(x,126 + ((x/8)%2)*2,6,2);
    ctx.fillStyle='#5b7f4d';
    ctx.fillRect(0,130,W,2);

    if (state.form === 'egg' && now() < state.hatchAt) {
      const left = Math.max(0, Math.ceil((state.hatchAt-now())/1000));
      drawSprite(PETS.egg.grid,46,28,4);
      pixelText(`HATCH ${left}s`, 49, 116, 2);
      return;
    }

    const bob = state.sleeping ? 0 : Math.round(Math.sin(now()/420)*2);
    drawSprite(PETS[state.form].grid,46,24+bob,4);

    if (state.poop) drawPoop(132,112);
    if (state.sick) { pixelText('!', 118, 24, 3); }
    if (state.sleeping) { pixelText('Z', 110, 36, 2); pixelText('Z', 126, 24, 1.5); }
    if (state.happiness > 75 && !state.sleeping) pixelHeart(25,30);
  }

  function drawSprite(grid,ox,oy,scale){
    ctx.fillStyle='#21361f';
    grid.forEach((row,y)=>[...row].forEach((v,x)=>{ if(v==='1') ctx.fillRect(ox+x*scale,oy+y*scale,scale,scale); }));
  }
  function drawPoop(x,y){ctx.fillStyle='#21361f';ctx.fillRect(x,y,12,3);ctx.fillRect(x+2,y-4,8,4);ctx.fillRect(x+4,y-8,5,4)}
  function pixelHeart(x,y){ctx.fillStyle='#21361f';ctx.fillRect(x,y,4,4);ctx.fillRect(x+8,y,4,4);ctx.fillRect(x-2,y+4,16,4);ctx.fillRect(x+2,y+8,8,4);ctx.fillRect(x+4,y+12,4,4)}
  function pixelText(text,x,y,scale=1){
    ctx.save();ctx.fillStyle='#21361f';ctx.font=`${8*scale}px ui-monospace, monospace`;ctx.textBaseline='top';ctx.fillText(text,x,y);ctx.restore();
  }

  function showModal(title, htmlOrNode) {
    $('#modalTitle').textContent = title;
    const body=$('#modalBody'); body.innerHTML='';
    if (typeof htmlOrNode === 'string') body.innerHTML=htmlOrNode; else body.appendChild(htmlOrNode);
    $('#modal').showModal();
  }
  function closeModal(){ $('#modal').close(); if(trainingTimer){cancelAnimationFrame(trainingTimer);trainingTimer=null;} }

  function guardHatched() {
    if (state.form === 'egg') { ticker('The egg cannot use that function yet.'); beep(220); return false; }
    return true;
  }

  function doAction(action) {
    beep();
    if (!guardHatched() && !['stats','log'].includes(action)) return;
    if (state.sleeping && !['sleep','stats','log'].includes(action)) { ticker('Your Cybit is sleeping. Turn the lights on first.'); return; }
    ({feed,train,clean,meds,sleep,battle,stats,log}[action] || (()=>{}))();
  }

  function feed(){
    const node=$('#feedTemplate').content.cloneNode(true);
    node.querySelectorAll('[data-food]').forEach(btn=>btn.addEventListener('click',()=>{
      const type=btn.dataset.food;
      if(type==='meal'){ state.hunger=clamp(state.hunger+26); state.weight+=2; state.feeds++; addLog('Served a compressed Data Meal.'); }
      else { state.hunger=clamp(state.hunger+10); state.happiness=clamp(state.happiness+8); state.weight+=1; state.feeds++; addLog('Byte Snack accepted with enthusiasm.'); }
      if(state.weight>24) state.happiness=clamp(state.happiness-2);
      closeModal(); render();
    }));
    showModal('FEED',node);
  }

  function train(){
    if(state.energy<12){ticker('Too tired to train. Rest first.');return;}
    const wrap=document.createElement('div');
    wrap.innerHTML=`<p>Tap <b>LOCK</b> while the cursor is inside the target band.</p><div class="train-zone"><i class="train-target"></i><i class="train-cursor"></i></div><button class="primary" id="lockTrain">LOCK SIGNAL</button><p class="kbd">A classic timing drill: stronger hits give more POWER.</p>`;
    showModal('TRAINING',wrap);
    const cursor=wrap.querySelector('.train-cursor'); let start=performance.now(); let pos=0;
    const animate=(t)=>{ const phase=((t-start)%1800)/1800; pos=phase<.5?phase*2:2-phase*2; cursor.style.left=`${2+pos*96}%`; trainingTimer=requestAnimationFrame(animate);};
    trainingTimer=requestAnimationFrame(animate);
    wrap.querySelector('#lockTrain').onclick=()=>{
      const score = Math.max(0, 1-Math.abs(pos-.5)*2);
      const gain = Math.round(3+score*9);
      state.strength=clamp(state.strength+gain); state.happiness=clamp(state.happiness+3); state.energy=clamp(state.energy-11); state.trainingCount++;
      addLog(`Training lock: ${score>.72?'PERFECT':score>.4?'GOOD':'WEAK'} (+${gain} power).`);
      closeModal();render();
    };
  }

  function clean(){
    if(!state.poop){state.hygiene=clamp(state.hygiene+8);addLog('Screen polished. Nothing else needed cleaning.');}
    else { const n=state.poop; state.poop=0;state.hygiene=clamp(state.hygiene+38);state.happiness=clamp(state.happiness+3);addLog(`Purged ${n} waste packet${n>1?'s':''}.`); }
    render();
  }

  function meds(){
    if(!state.sick){ticker('Diagnostics normal. Medicine not required.');return;}
    if(Math.random()<.82){state.sick=false;state.health=clamp(state.health+24);state.happiness=clamp(state.happiness-4);addLog('Antivirus dose worked. Data-fever cleared.');}
    else {state.happiness=clamp(state.happiness-5);addLog('Treatment failed. Try again after another care action.');}
    render();
  }

  function sleep(){
    state.sleeping=!state.sleeping;
    if(state.sleeping){addLog('Lights out. Energy will recover quickly.');}
    else {addLog('Lights on. Cybit resumed activity.');}
    render();
  }

  function battle(){
    const cooldown=120_000; const remaining=Math.ceil((state.lastBattle+cooldown-now())/1000);
    if(remaining>0){ticker(`Link arena cooling down: ${remaining}s.`);return;}
    if(state.energy<18||state.health<35){ticker('Battle link rejected: restore energy and health first.');return;}
    const enemyPower=Math.round(30+Math.random()*55+gameDay()*2);
    const enemy=['Rustrat','Pingoon','Hexmite','Cachecub','Nullfin'][Math.floor(Math.random()*5)];
    const wrap=document.createElement('div');
    wrap.innerHTML=`<p>Nearby signal found.</p><div class="battle-card"><b>${enemy}</b><br><small>Signal power: ${enemyPower}</small></div><button class="primary" id="fightBtn">LINK & BATTLE</button>`;
    showModal('BATTLE',wrap);
    wrap.querySelector('#fightBtn').onclick=()=>{
      const player=state.strength*.72+state.health*.18+state.happiness*.1+Math.random()*24;
      const foe=enemyPower+Math.random()*18;
      const win=player>=foe;
      state.lastBattle=now();state.battles++;state.energy=clamp(state.energy-17);
      if(win){state.battleWins++;state.strength=clamp(state.strength+4);state.happiness=clamp(state.happiness+9);addLog(`LINK WIN vs ${enemy}! Power increased.`);beep(820,.11);}
      else {state.battleLosses++;state.health=clamp(state.health-9);state.happiness=clamp(state.happiness-6);addLog(`LINK LOSS vs ${enemy}. No permanent damage.`);beep(180,.13);}
      closeModal();render();
    };
  }

  function stats(){
    const form=PETS[state.form]; const age=Math.floor(ageMinutes());
    const next = !state.evolved1 ? Math.max(0,10-age) : !state.evolved2 ? Math.max(0,45-age) : null;
    const html=`<table class="stat-table">
      <tr><td>FORM</td><td>${form.name}</td></tr><tr><td>AGE</td><td>${age} min</td></tr>
      <tr><td>HEALTH</td><td>${Math.round(state.health)}%</td></tr><tr><td>HYGIENE</td><td>${Math.round(state.hygiene)}%</td></tr>
      <tr><td>WEIGHT</td><td>${state.weight} KB</td></tr><tr><td>CARE MISTAKES</td><td>${state.careMistakes}</td></tr>
      <tr><td>TRAINING</td><td>${state.trainingCount}</td></tr><tr><td>BATTLES</td><td>${state.battleWins}W / ${state.battleLosses}L</td></tr>
      <tr><td>NEXT EVOLUTION</td><td>${next===null?'COMPLETE':`~${next} min`}</td></tr></table>`;
    showModal('STATUS',html);
  }

  function log(){
    const wrap=document.createElement('div');wrap.className='log-list';
    (state.log||[]).forEach(item=>{const d=document.createElement('div');d.className='log-item';d.textContent=`${new Date(item.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} — ${item.text}`;wrap.appendChild(d);});
    showModal('EVENT LOG',wrap);
  }

  function help(){
    showModal('HOW TO PLAY',`<p><b>Cybits</b> is a persistent pocket cyber-pet. Its condition continues changing after you close the app.</p><ul><li><b>Feed</b> before FOOD runs empty. Snacks improve mood but add weight.</li><li><b>Train</b> with the timing drill to raise POWER.</li><li><b>Clean</b> waste quickly; poor hygiene can cause data-fever.</li><li><b>Meds</b> treat illness.</li><li><b>Lights</b> toggle sleep, which rapidly restores ENERGY.</li><li><b>Battle</b> nearby rogue signals to build a combat record.</li><li>Care quality, mistakes, and training determine evolution.</li></ul><p>Your first hatch happens after about 30 seconds. Major evolutions occur around 10 and 45 minutes of active life in this launch build.</p>`);
  }

  function rename(){
    if(state.form==='egg'){ticker('Wait for the egg to hatch before naming your Cybit.');return;}
    const current=state.petName==='BITLING'?PETS[state.form].name:state.petName;
    const name=prompt('Name your Cybit (12 characters max):',current);
    if(name && name.trim()){state.petName=name.trim().slice(0,12).toUpperCase();addLog(`Identity set: ${state.petName}.`);render();}
  }

  function resetGame(){
    if(!confirm('Erase this Cybit and start with a new egg? This cannot be undone.'))return;
    state=newState();save();ticker('A new dormant Cybit egg is waiting for a signal…');render();
  }

  $$('.actions button').forEach((btn,i)=>btn.addEventListener('click',()=>{menuIndex=i;doAction(btn.dataset.action);render();}));
  $('#modalClose').onclick=closeModal; $('#modal').addEventListener('click',(e)=>{if(e.target===$('#modal'))closeModal();});
  $('#soundBtn').onclick=()=>{state.sound=!state.sound;save();render();if(state.sound)beep();};
  $('#renameBtn').onclick=rename; $('#helpBtn').onclick=help; $('#resetBtn').onclick=resetGame;
  $('#btnA').onclick=()=>{menuIndex=(menuIndex+7)%8;beep(420);render();};
  $('#btnB').onclick=()=>{const b=$$('.actions button')[menuIndex];doAction(b.dataset.action);};
  $('#btnC').onclick=()=>{if($('#modal').open)closeModal();else{menuIndex=0;ticker('Home signal restored.');render();}beep(300);};

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save();else{simulateOffline(state);render();}});
  window.addEventListener('beforeunload',save);

  if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(console.warn));

  render();
  setInterval(tick,TICK_MS);
})();
