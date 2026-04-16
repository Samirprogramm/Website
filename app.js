// js/app.js - Warenkorb + Mock Checkout (kurz & kommentiert)
const products = [
  {id:1,title:'ESP32 Dev Kit',price:19.90,desc:'ESP32 Dev Kit für IoT Projekte'},
  {id:2,title:'WiFi Testing Kit',price:49.90,desc:'Tools für WiFi Analyse'},
  {id:3,title:'Pentesting Lab',price:29.90,desc:'Starter Kit für Pentesting Lab'}
];

const app = document.getElementById('app');
let cart = JSON.parse(localStorage.getItem('cart')||'[]');

function formatCHF(n){ return 'CHF ' + n.toFixed(2); }

function render(){
  app.innerHTML = `
  <div class="layout">
    <aside class="sidebar"> <h1>CyberSec</h1><nav>...</nav></aside>
    <section class="main">
      <header><h2>Neueste Produkte</h2></header>
      <div id="product-list" class="grid"></div>
      <section id="blog">...</section>
    </section>
    <aside class="cart card">
      <h3>Warenkorb <span id="count">0</span></h3>
      <ul id="cart-items"></ul>
      <div>Zwischensumme: <strong id="subtotal">CHF 0.00</strong></div>
      <button id="checkout" class="primary">Mit TWINT bezahlen</button>
    </aside>
  </div>
  <div id="modal" class="modal" hidden></div>
  `;
  renderProducts();
  updateCart();
  bindEvents();
}

function renderProducts(){
  const list = document.getElementById('product-list');
  list.innerHTML = products.map(p=>`
    <article class="product">
      <h4>${p.title}</h4>
      <p class="desc">${p.desc}</p>
      <div class="row"><div class="price">${formatCHF(p.price)}</div>
      <button data-id="${p.id}" class="add">In den Warenkorb</button></div>
    </article>`).join('');
}

function bindEvents(){
  document.querySelectorAll('.add').forEach(b=>b.addEventListener('click', e=>{
    const id = +e.currentTarget.dataset.id;
    addToCart(id);
  }));
  document.getElementById('checkout').addEventListener('click', checkout);
}

function addToCart(id){
  const p = products.find(x=>x.id===id);
  cart.push({...p, uid:Date.now()+Math.random()});
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCart();
  toast('Artikel hinzugefügt');
}

function updateCart(){
  const ul = document.getElementById('cart-items');
  ul.innerHTML = cart.map(i=>`<li>${i.title} — ${formatCHF(i.price)} <button data-uid="${i.uid}" class="rm">x</button></li>`).join('');
  document.getElementById('subtotal').textContent = formatCHF(cart.reduce((s,i)=>s+i.price,0));
  document.getElementById('count').textContent = cart.length;
  document.querySelectorAll('.rm').forEach(b=>b.addEventListener('click', e=>{
    const uid = e.currentTarget.dataset.uid; cart = cart.filter(x=>x.uid!==uid);
    localStorage.setItem('cart', JSON.stringify(cart)); updateCart();
  }));
}

async function checkout(){
  if(cart.length===0){ alert('Warenkorb leer'); return; }
  // Mock: POST an /create-payment (auf deinem Mock-Server) oder lokal simulieren
  try{
    const res = await fetch('/create-payment', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({items:cart,currency:'CHF',method:'twint'})});
    const data = await res.json();
    if(data.qrImage){
      showModal(`<img src="${data.qrImage}" alt="TWINT QR"><p><a href="${data.paymentUrl}" target="_blank">Zahlung öffnen</a></p>`);
      pollStatus(data.paymentId);
    } else if(data.redirectUrl) window.location = data.redirectUrl;
  }catch(e){ console.error(e); alert('Checkout fehlgeschlagen'); }
}

function showModal(html){ const m=document.getElementById('modal'); m.innerHTML=html; m.hidden=false; }
function pollStatus(id){ const t=setInterval(async ()=>{
  const r=await fetch('/payment-status?paymentId='+encodeURIComponent(id)); const j=await r.json();
  if(j.status==='paid'){ clearInterval(t); cart=[]; localStorage.removeItem('cart'); updateCart(); showModal('<p>Zahlung erhalten. Danke!</p>'); }
},3000); }

function toast(msg){ console.log(msg); /* implementiere visuelles Toast */ }

render();
