// js/app.js
'use strict';

const PRODUCTS = [
  { id: 1, title: 'ESP32 Dev Kit', price: 19.90, desc: 'ESP32 Dev Kit für IoT Projekte' },
  { id: 2, title: 'WiFi Testing Kit', price: 49.90, desc: 'Tools für WiFi Analyse' },
  { id: 3, title: 'Pentesting Lab', price: 29.90, desc: 'Starter Kit für Pentesting Lab' }
];

const state = {
  cart: JSON.parse(localStorage.getItem('cybersec_cart') || '[]'),
  payments: {}
};

function formatCHF(n) { return 'CHF ' + n.toFixed(2); }

/* Render Hauptstruktur */
function mount() {
  renderProducts();
  renderCart();
  bindUI();
  updateCartBadge();
}

/* Produkte rendern */
function renderProducts() {
  const container = document.getElementById('products');
  container.innerHTML = PRODUCTS.map(p => `
    <article class="product" tabindex="0" data-id="${p.id}">
      <div>
        <h4>${escapeHtml(p.title)}</h4>
        <div class="meta">${escapeHtml(p.desc)}</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <div class="price">${formatCHF(p.price)}</div>
        <div>
          <button class="btn primary add" data-id="${p.id}">In den Warenkorb</button>
        </div>
      </div>
    </article>
  `).join('');
}

/* Warenkorb rendern */
function renderCart() {
  const list = document.getElementById('cart-items');
  list.innerHTML = '';
  let total = 0;
  state.cart.forEach(item => {
    total += item.price;
    const li = document.createElement('li');
    li.innerHTML = `
      <div style="flex:1">
        <strong>${escapeHtml(item.title)}</strong>
        <div class="meta">${formatCHF(item.price)}</div>
      </div>
      <div>
        <button class="link-btn remove" data-uid="${item.uid}" aria-label="Entfernen ${escapeHtml(item.title)}">Entfernen</button>
      </div>
    `;
    list.appendChild(li);
  });
  document.getElementById('subtotal').textContent = formatCHF(total);
  document.getElementById('count').textContent = state.cart.length;
  updateCartBadge();
}

/* UI Events binden */
function bindUI() {
  document.querySelectorAll('.add').forEach(btn => btn.addEventListener('click', e => {
    const id = Number(e.currentTarget.dataset.id);
    addToCart(id);
  }));

  document.getElementById('clear-cart').addEventListener('click', () => {
    if (confirm('Warenkorb wirklich leeren?')) {
      state.cart = [];
      saveCart();
      renderCart();
      toast('Warenkorb geleert');
    }
  });

  document.getElementById('checkout').addEventListener('click', checkout);
  document.getElementById('checkout-card').addEventListener('click', () => toast('Karten‑Checkout noch nicht konfiguriert'));

  document.getElementById('open-cart').addEventListener('click', () => {
    document.getElementById('cart').scrollIntoView({ behavior: 'smooth' });
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });

  // Delegation für Entfernen Buttons
  document.getElementById('cart-items').addEventListener('click', (e) => {
    if (e.target.matches('.remove')) {
      const uid = e.target.dataset.uid;
      state.cart = state.cart.filter(i => i.uid !== uid);
      saveCart();
      renderCart();
      toast('Artikel entfernt');
    }
  });
}

/* Warenkorb Funktionen */
function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const item = { ...p, uid: Date.now().toString(36) + Math.random().toString(36).slice(2,8) };
  state.cart.push(item);
  saveCart();
  renderCart();
  toast('Artikel hinzugefügt');
}

function saveCart() {
  localStorage.setItem('cybersec_cart', JSON.stringify(state.cart));
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  badge.textContent = state.cart.length;
}

/* Checkout mit Mock Backend */
async function checkout() {
  if (state.cart.length === 0) { alert('Warenkorb ist leer'); return; }
  showLoading(true);
  try {
    const res = await fetch('/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.cart, currency: 'CHF', method: 'twint' })
    });
    const data = await res.json();
    if (data.error) { alert('Fehler: ' + data.error); showLoading(false); return; }

    // Wenn Redirect
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
      return;
    }

    // Wenn QR Image zurückkommt
    if (data.qrImage) {
      openModal(`<h2 id="modal-title">TWINT Zahlung</h2>
        <div style="text-align:center">
          <img src="${data.qrImage}" alt="TWINT QR Code" style="width:260px;height:260px;border-radius:8px;background:#fff;padding:8px">
          <div style="margin-top:10px"><a href="${data.paymentUrl}" target="_blank" rel="noopener" class="btn ghost">Zahlung öffnen</a></div>
        </div>
        <p class="small" style="margin-top:12px">Scanne den QR mit deiner TWINT App oder öffne den Link.</p>`);
      pollPaymentStatus(data.paymentId);
    } else {
      alert('Zahlungsanforderung erstellt. Folge den Anweisungen.');
    }
  } catch (err) {
    console.error(err);
    alert('Netzwerkfehler beim Checkout.');
  } finally {
    showLoading(false);
  }
}

/* Polling für Mock Payment Status */
function pollPaymentStatus(paymentId) {
  const interval = setInterval(async () => {
    try {
      const r = await fetch('/payment-status?paymentId=' + encodeURIComponent(paymentId));
      const j = await r.json();
      if (j.status === 'paid') {
        clearInterval(interval);
        closeModal();
        state.cart = [];
        saveCart();
        renderCart();
        toast('Zahlung erhalten. Danke!');
      } else if (j.status === 'failed') {
        clearInterval(interval);
        toast('Zahlung fehlgeschlagen', 4000);
      }
    } catch (e) {
      console.error(e);
    }
  }, 3000);
}

/* Modal und Toast */
function openModal(html) {
  const backdrop = document.getElementById('modal-backdrop');
  document.getElementById('modal-body').innerHTML = html;
  backdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  document.getElementById('modal-backdrop').hidden = true;
  document.body.style.overflow = '';
}
function toast(msg, time = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  setTimeout(() => t.hidden = true, time);
}

/* Utility */
function showLoading(flag) {
  const btn = document.getElementById('checkout');
  if (flag) { btn.disabled = true; btn.textContent = 'Bitte warten…'; }
  else { btn.disabled = false; btn.textContent = 'Mit TWINT bezahlen'; }
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* Init */
document.addEventListener('DOMContentLoaded', mount);
