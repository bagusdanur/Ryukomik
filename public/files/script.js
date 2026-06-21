/* =========================================================
   EmpeShop Clone — shared script
   ========================================================= */

/* ---------- Mobile nav ---------- */
document.querySelectorAll('.nav-toggle').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const nav = document.querySelector('.main-nav');
    nav.style.display = nav.style.display === 'flex' ? 'none' : 'flex';
  });
});

/* ---------- Banner carousel ---------- */
(function(){
  const track = document.querySelector('.carousel-track');
  if(!track) return;
  const slides = track.children.length;
  const dotsWrap = document.querySelector('.carousel-dots');
  let idx = 0;

  for(let i=0;i<slides;i++){
    const d = document.createElement('button');
    if(i===0) d.classList.add('active');
    d.addEventListener('click', ()=>go(i));
    dotsWrap.appendChild(d);
  }

  function go(i){
    idx = (i+slides)%slides;
    track.style.transform = `translateX(-${idx*100}%)`;
    [...dotsWrap.children].forEach((d,n)=>d.classList.toggle('active', n===idx));
  }

  document.querySelector('.carousel-arrow.next')?.addEventListener('click', ()=>go(idx+1));
  document.querySelector('.carousel-arrow.prev')?.addEventListener('click', ()=>go(idx-1));

  let timer = setInterval(()=>go(idx+1), 4500);
  const carousel = document.querySelector('.carousel');
  carousel.addEventListener('mouseenter', ()=>clearInterval(timer));
  carousel.addEventListener('mouseleave', ()=>timer = setInterval(()=>go(idx+1), 4500));
})();

/* ---------- Flash sale countdown ---------- */
document.querySelectorAll('.flash-timer').forEach(el=>{
  let total = 3*3600 + 24*60 + 9; // arbitrary starting countdown
  const span = el.querySelector('span');
  function tick(){
    if(total <= 0) total = 3*3600;
    const h = String(Math.floor(total/3600)).padStart(2,'0');
    const m = String(Math.floor((total%3600)/60)).padStart(2,'0');
    const s = String(total%60).padStart(2,'0');
    span.textContent = `${h}:${m}:${s}`;
    total--;
  }
  tick();
  setInterval(tick, 1000);
});

/* ---------- Category tabs (home) ---------- */
document.querySelectorAll('.cat-tabs button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
  });
});

/* ---------- Nominal selection (product page) ---------- */
(function(){
  const cards = document.querySelectorAll('.nominal-card');
  if(!cards.length) return;
  const priceEl = document.getElementById('sum-price');
  const totalEl = document.getElementById('sum-total');
  const nameEl  = document.getElementById('sum-item');

  cards.forEach(card=>{
    card.addEventListener('click', ()=>{
      cards.forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      const price = card.dataset.price;
      const label = card.dataset.label;
      if(priceEl) priceEl.textContent = price;
      if(totalEl) totalEl.textContent = price;
      if(nameEl) nameEl.textContent = label;
    });
  });
})();

/* ---------- Payment selection ---------- */
document.querySelectorAll('.pay-card').forEach(card=>{
  card.addEventListener('click', ()=>{
    document.querySelectorAll('.pay-card').forEach(c=>c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq-q').forEach(q=>{
  q.addEventListener('click', ()=>{
    const item = q.parentElement;
    const wasOpen = item.classList.contains('open');
    item.parentElement.querySelectorAll('.faq-item').forEach(i=>{
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = null;
    });
    if(!wasOpen){
      item.classList.add('open');
      const a = item.querySelector('.faq-a');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

/* ---------- Buy button demo ---------- */
document.querySelectorAll('[data-buy]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    alert('Ini halaman demo clone — belum terhubung ke sistem pembayaran sungguhan.');
  });
});
