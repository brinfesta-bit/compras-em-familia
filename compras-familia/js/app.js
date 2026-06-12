import { auth }   from './firebase-config.js';
import { db }     from './firebase-config.js';
import {
  collection, doc, setDoc, onSnapshot,
  updateDoc, deleteDoc, writeBatch, getDocs,
  query, orderBy, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { categorias } from './data.js';

// ── Estado global ──────────────────────────────────────────────────────────
let currentUser     = null;
let allItems        = {};        // { [itemId]: itemData }
let unsubscribeDB   = null;
let dragSrcId       = null;
let currentFilter   = 'pendentes';
let queroCount      = 0;  // contador de itens 'quero comprar'
let searchQuery     = '';
let allCollapsed    = false;

const FEIRA_COL     = 'feira_atual';
const FEIRAS_COL    = 'feiras_salvas';
const ITEMS_SUB     = 'itens';

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Formatação ─────────────────────────────────────────────────────────────
function fmt(v) {
  return `R$ ${(+v || 0).toFixed(2).replace('.', ',')}`;
}

// ── Auth ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = user;
  initUserUI(user);
  initApp();
});

function initUserUI(user) {
  const short = user.email.split('@')[0].slice(0,2).toUpperCase();
  document.getElementById('user-avatar').textContent = short;
  document.getElementById('user-email-short').textContent = user.email.split('@')[0];
  document.getElementById('modal-user-email').textContent = user.email;
}

// ── Inicializar App ────────────────────────────────────────────────────────
async function initApp() {
  buildSidebar();
  populateCategorySelect();
  await ensureItemsExist();
  subscribeItems();
  await migrateQueremos();
  bindEvents();

  // Esconder sidebar no mobile via JS (garante independente do CSS)
  function ajustarSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.innerWidth < 700) {
      sidebar.style.display = 'none';
    } else {
      sidebar.style.display = '';
    }
  }
  ajustarSidebar();
  window.addEventListener('resize', ajustarSidebar);

  // Esconder loading
  setTimeout(() => {
    const lo = document.getElementById('loading-overlay');
    lo.classList.add('hide');
    setTimeout(() => lo.remove(), 600);
  }, 800);
}

// ── Garantir que itens existam no Firestore ────────────────────────────────
async function ensureItemsExist() {
  const col = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
  const snap = await getDocs(col);
  if (!snap.empty) return; // já populado

  toast('Criando lista inicial…', 'success');
  const batch = writeBatch(db);
  let ordem = 0;
  for (const cat of categorias) {
    for (const nome of cat.itens) {
      const ref = doc(col);
      batch.set(ref, {
        nome,
        categoria:   cat.id,
        quantidade:  1,
        unidade:     'un',
        preco:       0,
        comprado:    false,
        queremos:    false,
        ordem:       ordem++,
        criadoEm:    serverTimestamp()
      });
    }
  }
  await batch.commit();
}

// ── Listener tempo real ────────────────────────────────────────────────────
function subscribeItems() {
  if (unsubscribeDB) unsubscribeDB();
  const col = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
  const q   = query(col, orderBy('ordem'));
  unsubscribeDB = onSnapshot(q, snap => {
    allItems = {};
    snap.forEach(d => { allItems[d.id] = { id: d.id, ...d.data() }; });
    render();
  }, err => {
    console.error(err);
    toast('Erro ao sincronizar. Verifique a conexão.', 'error');
  });
}

// ── Renderização principal ─────────────────────────────────────────────────
function render() {
  const container   = document.getElementById('items-container');
  const boughtSect  = document.getElementById('bought-section');
  const boughtList  = document.getElementById('bought-list');
  container.innerHTML = '';
  boughtList.innerHTML = '';

  let filteredItems = Object.values(allItems);

  // Busca
  if (searchQuery) {
    const normalize = str => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const q = normalize(searchQuery);
    filteredItems = filteredItems.filter(i => normalize(i.nome).includes(q));
  }

  const pending  = filteredItems.filter(i => !i.comprado);
  const bought   = filteredItems.filter(i =>  i.comprado);

  // Filtro
  let toShow = [];
  if (currentFilter === 'todos')      toShow = filteredItems;
  if (currentFilter === 'pendentes')  toShow = pending;
  if (currentFilter === 'queremos')   toShow = filteredItems.filter(i => i.queremos && !i.comprado);
  if (currentFilter === 'comprados')  toShow = bought;

  // Atualizar badge do botão "A comprar"
  const queroItems = Object.values(allItems).filter(i => i.queremos && !i.comprado);
  queroCount = queroItems.length;
  const btnQueremos = document.getElementById('filter-queremos');
  if (btnQueremos) {
    btnQueremos.innerHTML = queroCount > 0
      ? `🛒 A comprar <span class="chip-badge">${queroCount}</span>`
      : '🛒 A comprar';
  }

  // Agrupar por categoria — queremos sobem ao topo
  const byCat = {};
  for (const cat of categorias) byCat[cat.id] = [];
  for (const item of toShow.filter(i => !i.comprado)) {
    const cid = item.categoria || 'hortifrutti';
    if (!byCat[cid]) byCat[cid] = [];
    byCat[cid].push(item);
  }
  // Ordenar: queremos=true primeiro, depois ordem normal
  for (const cid of Object.keys(byCat)) {
    byCat[cid].sort((a, b) => {
      if (a.queremos && !b.queremos) return -1;
      if (!a.queremos && b.queremos) return  1;
      return (a.ordem || 0) - (b.ordem || 0);
    });
  }

  // Renderizar categorias
  if (currentFilter !== 'comprados') {
    for (const cat of categorias) {
      const items = byCat[cat.id];
      if (!items || (items.length === 0 && currentFilter === 'pendentes')) continue;
      if (!items || items.length === 0) continue;
      container.appendChild(buildCategoryBlock(cat, items));
    }
  }

  // Seção de comprados
  if (bought.length > 0 && currentFilter !== 'pendentes') {
    boughtSect.classList.remove('hidden');
    document.getElementById('bought-count').textContent = bought.length;
    for (const item of bought) {
      boughtList.appendChild(buildItemCard(item));
    }
  } else {
    boughtSect.classList.add('hidden');
  }

  if (currentFilter === 'comprados') {
    for (const item of bought) {
      container.appendChild(buildItemCard(item));
    }
  }

  updateFooter();
  updateSidebarCounts();
}

// ── Bloco de categoria ─────────────────────────────────────────────────────
function buildCategoryBlock(cat, items) {
  const total   = items.length;
  const doneQty = items.filter(i => i.comprado).length;
  const pct     = total > 0 ? Math.round(doneQty / total * 100) : 0;

  const block = document.createElement('div');
  block.className  = 'category-block';
  block.dataset.cat = cat.id;

  block.innerHTML = `
    <div class="category-header">
      <div class="cat-label">
        <span class="cat-emoji">${cat.icone}</span>
        <span class="cat-title" style="color:${cat.cor}">${cat.nome}</span>
        <span class="cat-progress-text">${total} iten${total !== 1 ? 's' : ''}</span>
      </div>
      <span class="cat-toggle">▾</span>
    </div>
    <div class="cat-progress-bar">
      <div class="cat-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${cat.cor},${cat.cor}cc)"></div>
    </div>
    <div class="items-list" data-cat="${cat.id}"></div>
  `;

  const header = block.querySelector('.category-header');
  header.addEventListener('click', () => block.classList.toggle('collapsed'));

  const list = block.querySelector('.items-list');
  for (const item of items) list.appendChild(buildItemCard(item));

  // Drop zone (com posição)
  list.addEventListener('dragover', e => {
    e.preventDefault();
    list.classList.add('drag-over');
    // Encontrar o card mais próximo do cursor
    const cards = [...list.querySelectorAll('.item-card:not(.drag-ghost)')];
    const closest = cards.reduce((best, card) => {
      const box = card.getBoundingClientRect();
      const offset = e.clientY - (box.top + box.height / 2);
      if (offset < 0 && offset > best.offset) return { offset, el: card };
      return best;
    }, { offset: Number.NEGATIVE_INFINITY, el: null });
    dragOverId = closest.el ? closest.el.dataset.id : null;
    // Highlight visual
    cards.forEach(c => c.classList.remove('drag-target'));
    if (closest.el) closest.el.classList.add('drag-target');
  });
  list.addEventListener('dragleave', e => {
    if (!list.contains(e.relatedTarget)) {
      list.classList.remove('drag-over');
      list.querySelectorAll('.drag-target').forEach(c => c.classList.remove('drag-target'));
    }
  });
  list.addEventListener('drop', e => {
    e.preventDefault();
    list.classList.remove('drag-over');
    list.querySelectorAll('.drag-target').forEach(c => c.classList.remove('drag-target'));
    onDrop(list.dataset.cat, dragOverId);
  });

  return block;
}

// ── Card de item ───────────────────────────────────────────────────────────
function buildItemCard(item) {
  const cat = categorias.find(c => c.id === item.categoria) || categorias[0];
  const card = document.createElement('div');
  card.className = `item-card${item.comprado ? ' bought' : ''}`;
  card.dataset.id = item.id;
  card.draggable  = true;

  const precoFmt = item.preco > 0 ? fmt(item.preco) : 'add preço';
  const subtotal = item.preco * (item.quantidade || 1);

  card.style.cssText = 'display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;width:100%;box-sizing:border-box;';
  card.innerHTML = `
    <span class="drag-handle" title="Arrastar" style="flex-shrink:0;cursor:grab;font-size:1rem;padding:0 4px;color:#64748b;">⠿</span>
    <div class="item-check${item.comprado ? ' checked' : ''}" data-id="${item.id}" style="flex-shrink:0;"></div>
    <div class="item-info" style="flex:1 1 0%;min-width:0;width:0;overflow:hidden;">
      <div class="item-name" style="display:block;width:100%;min-width:0;white-space:normal;word-break:break-word;overflow-wrap:anywhere;font-size:0.88rem;font-weight:600;line-height:1.3;">${escHtml(item.nome)}</div>
      <div class="item-meta" style="display:flex;align-items:center;gap:6px;margin-top:2px;">
        <span class="item-qty">${item.quantidade || 1} ${item.unidade || 'un'}</span>
        ${subtotal > 0 ? `<span class="item-qty" style="color:var(--accent)">= ${fmt(subtotal)}</span>` : ''}
      </div>
    </div>
    <div class="item-price-wrapper" style="flex-shrink:0;">
      <span class="item-price-display${item.preco > 0 ? '' : ' zero'}" data-id="${item.id}">${precoFmt}</span>
      <input type="number" class="input item-price-input" data-id="${item.id}" value="${item.preco || ''}" placeholder="0.00" min="0" step="0.01">
    </div>
    <div class="item-actions" style="display:flex;gap:2px;flex-shrink:0;">
      <button class="action-btn quero${item.queremos ? ' quero-ativo' : ''}" data-id="${item.id}" title="${item.queremos ? 'Remover da lista' : 'Quero comprar'}" style="background:${item.queremos ? 'rgba(239,68,68,0.15)' : 'transparent'};color:${item.queremos ? '#ef4444' : '#64748b'};">🛒</button>
      <button class="action-btn edit" data-id="${item.id}" title="Editar">✏️</button>
      <button class="action-btn delete" data-id="${item.id}" title="Excluir">🗑️</button>
    </div>
  `;
  if (item.queremos && !item.comprado) {
    card.classList.add('queremos');
    card.style.borderColor = 'rgba(239,68,68,0.5)';
    card.style.background  = 'rgba(239,68,68,0.08)';
    const nm = card.querySelector('.item-name');
    if (nm) nm.style.color = '#fca5a5';
  }

  // ── Drag (mouse/desktop) ──
  card.addEventListener('dragstart', e => {
    dragSrcId = item.id;
    card.classList.add('drag-ghost');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('drag-ghost');
    document.querySelectorAll('.drag-target').forEach(c => c.classList.remove('drag-target'));
  });

  // ── Touch Drag (mobile) ──
  let touchClone   = null;
  let touchStartY  = 0;
  let touchStartX  = 0;
  let touchMoved   = false;
  let touchTimer   = null;

  const handle = card.querySelector('.drag-handle') || card;

  handle.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
    touchMoved  = false;
    // Long press para iniciar drag
    touchTimer  = setTimeout(() => {
      dragSrcId = item.id;
      // Criar clone visual
      touchClone = card.cloneNode(true);
      touchClone.style.cssText = `
        position:fixed; z-index:9999; pointer-events:none;
        width:${card.offsetWidth}px; opacity:0.85;
        border:2px solid var(--accent); border-radius:12px;
        box-shadow:0 8px 30px rgba(16,185,129,0.4);
        transform:scale(1.03); transition:none;
        left:${card.getBoundingClientRect().left}px;
        top:${card.getBoundingClientRect().top}px;
      `;
      document.body.appendChild(touchClone);
      card.classList.add('drag-ghost');
      // Vibrar se disponível
      if (navigator.vibrate) navigator.vibrate(30);
    }, 350);
  }, { passive: true });

  handle.addEventListener('touchmove', e => {
    const dy = Math.abs(e.touches[0].clientY - touchStartY);
    const dx = Math.abs(e.touches[0].clientX - touchStartX);
    if (dy > 5 || dx > 5) touchMoved = true;

    if (!touchClone) {
      clearTimeout(touchTimer);
      return;
    }
    e.preventDefault();

    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchClone.offsetWidth / 2) + 'px';
    touchClone.style.top  = (touch.clientY - 30) + 'px';

    // Encontrar o card embaixo do toque
    touchClone.style.display = 'none';
    const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    touchClone.style.display = '';

    // Highlight drop target
    document.querySelectorAll('.drag-target').forEach(c => c.classList.remove('drag-target'));
    const targetCard = elBelow?.closest('.item-card');
    if (targetCard && targetCard !== card) {
      dragOverId = targetCard.dataset.id;
      targetCard.classList.add('drag-target');
    } else {
      dragOverId = null;
    }
  }, { passive: false });

  handle.addEventListener('touchend', e => {
    clearTimeout(touchTimer);
    if (!touchClone) return;

    const touch = e.changedTouches[0];

    // Remover clone
    touchClone.remove();
    touchClone = null;
    card.classList.remove('drag-ghost');
    document.querySelectorAll('.drag-target').forEach(c => c.classList.remove('drag-target'));

    // Encontrar categoria de destino
    const elBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetList = elBelow?.closest('.items-list');
    const targetCat  = targetList?.dataset.cat || item.categoria;

    onDrop(targetCat, dragOverId);
  }, { passive: true });

  handle.addEventListener('touchcancel', () => {
    clearTimeout(touchTimer);
    if (touchClone) { touchClone.remove(); touchClone = null; }
    card.classList.remove('drag-ghost');
    dragSrcId = null;
  }, { passive: true });

  // Toggle comprado
  card.querySelector('.item-check').addEventListener('click', e => {
    e.stopPropagation();
    toggleBought(item.id, !item.comprado);
  });

  // Editar preço inline
  const priceDisplay = card.querySelector('.item-price-display');
  const priceInput   = card.querySelector('.item-price-input');

  priceDisplay.addEventListener('click', e => {
    e.stopPropagation();
    priceDisplay.classList.add('hidden');
    priceInput.classList.add('show');
    priceInput.focus();
    priceInput.select();
  });

  priceInput.addEventListener('blur', () => savePrice(item.id, priceInput.value));
  priceInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') priceInput.blur();
    if (e.key === 'Escape') {
      priceInput.classList.remove('show');
      priceDisplay.classList.remove('hidden');
    }
  });

  // Ações
  card.querySelector('.action-btn.quero').addEventListener('click', e => {
    e.stopPropagation();
    toggleQueremos(item.id, !item.queremos);
  });
  card.querySelector('.action-btn.edit').addEventListener('click', e => {
    e.stopPropagation();
    openEditModal(item);
  });
  card.querySelector('.action-btn.delete').addEventListener('click', e => {
    e.stopPropagation();
    deleteItem(item.id, item.nome);
  });

  return card;
}

// ── Drag & Drop ───────────────────────────────────────────────────────────
let dragOverId = null;   // id do item sobre o qual estamos passando

async function onDrop(targetCatId, beforeId = null) {
  if (!dragSrcId) return;
  const item = allItems[dragSrcId];
  if (!item) { dragSrcId = null; return; }

  try {
    const col   = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
    const batch = writeBatch(db);

    // Mudou de categoria?
    if (item.categoria !== targetCatId) {
      batch.update(doc(col, dragSrcId), { categoria: targetCatId });
    }

    // Reordenar: pegar todos itens da categoria de destino, inserir antes de beforeId
    const catItems = Object.values(allItems)
      .filter(i => (i.categoria === targetCatId || i.id === dragSrcId) && !i.comprado)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    // Remover o item arrastado da lista temporária
    const withoutSrc = catItems.filter(i => i.id !== dragSrcId);

    // Inserir na posição correta
    let insertIdx = withoutSrc.length; // padrão: final
    if (beforeId) {
      const idx = withoutSrc.findIndex(i => i.id === beforeId);
      if (idx !== -1) insertIdx = idx;
    }
    withoutSrc.splice(insertIdx, 0, allItems[dragSrcId]);

    // Salvar ordens
    withoutSrc.forEach((it, idx) => {
      batch.update(doc(col, it.id), { ordem: idx });
    });

    await batch.commit();
    if (item.categoria !== targetCatId) {
      toast(`Item movido para ${categorias.find(c=>c.id===targetCatId)?.nome || targetCatId}`, 'success');
    }
  } catch(e) {
    console.error(e);
    toast('Erro ao mover item.', 'error');
  }
  dragSrcId  = null;
  dragOverId = null;
}

// ── Marcar comprado ────────────────────────────────────────────────────────
async function toggleBought(id, bought) {
  try {
    // Calcular próxima ordem (ao final da lista)
    const maxOrdem = Math.max(...Object.values(allItems).map(i => i.ordem || 0));
    await updateDoc(doc(db, FEIRA_COL, 'lista', ITEMS_SUB, id), {
      comprado: bought,
      ordem:    bought ? maxOrdem + 1 : (allItems[id]?.ordem || 0)
    });
  } catch(e) {
    toast('Erro ao atualizar item.', 'error');
  }
}

// ── Migração: garantir campo queremos nos itens antigos ───────────────────
async function migrateQueremos() {
  const col   = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
  const snap  = await getDocs(col);
  const batch = writeBatch(db);
  let   count = 0;
  snap.forEach(d => {
    if (d.data().queremos === undefined) {
      batch.update(doc(col, d.id), { queremos: false });
      count++;
    }
  });
  if (count > 0) await batch.commit();
}

// ── Marcar "quero comprar" ────────────────────────────────────────────────
async function toggleQueremos(id, queremos) {
  try {
    await updateDoc(doc(db, FEIRA_COL, 'lista', ITEMS_SUB, id), { queremos });
  } catch(e) {
    toast('Erro ao atualizar item.', 'error');
  }
}

// ── Salvar preço inline ────────────────────────────────────────────────────
async function savePrice(id, value) {
  const preco = parseFloat(value) || 0;
  try {
    await updateDoc(doc(db, FEIRA_COL, 'lista', ITEMS_SUB, id), { preco });
  } catch(e) { /* silently */ }
}

// ── Excluir item ───────────────────────────────────────────────────────────
async function deleteItem(id, nome) {
  if (!confirm(`Excluir "${nome}"?`)) return;
  try {
    await deleteDoc(doc(db, FEIRA_COL, 'lista', ITEMS_SUB, id));
    toast(`"${nome}" removido.`, 'success');
  } catch(e) {
    toast('Erro ao excluir.', 'error');
  }
}

// ── Modal Editar/Adicionar ─────────────────────────────────────────────────
function openEditModal(item = null) {
  const modal = document.getElementById('edit-modal');
  document.getElementById('modal-title').textContent = item ? 'Editar item' : 'Novo item';
  document.getElementById('edit-item-id').value    = item?.id || '';
  document.getElementById('edit-nome').value       = item?.nome || '';
  document.getElementById('edit-qty').value        = item?.quantidade || 1;
  document.getElementById('edit-unidade').value    = item?.unidade || 'un';
  document.getElementById('edit-preco').value      = item?.preco || '';
  document.getElementById('edit-categoria').value  = item?.categoria || categorias[0].id;
  modal.classList.remove('hidden');
  document.getElementById('edit-nome').focus();
}

async function saveItem() {
  const id        = document.getElementById('edit-item-id').value;
  const nome      = document.getElementById('edit-nome').value.trim();
  const quantidade= parseInt(document.getElementById('edit-qty').value) || 1;
  const unidade   = document.getElementById('edit-unidade').value;
  const preco     = parseFloat(document.getElementById('edit-preco').value) || 0;
  const categoria = document.getElementById('edit-categoria').value;

  if (!nome) { toast('Insira o nome do item.', 'error'); return; }

  const col = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
  try {
    if (id) {
      await updateDoc(doc(col, id), { nome, quantidade, unidade, preco, categoria });
      toast('Item atualizado!', 'success');
    } else {
      const maxOrdem = Math.max(0, ...Object.values(allItems).map(i => i.ordem || 0));
      await setDoc(doc(col), { nome, quantidade, unidade, preco, categoria, comprado: false, ordem: maxOrdem + 1, criadoEm: serverTimestamp() });
      toast(`"${nome}" adicionado!`, 'success');
    }
    closeModal('edit-modal');
  } catch(e) {
    toast('Erro ao salvar.', 'error');
  }
}

// ── Salvar Feira ───────────────────────────────────────────────────────────
async function saveFeira() {
  // Verificar limite
  const feirasSnap = await getDocs(collection(db, FEIRAS_COL));
  if (feirasSnap.size >= 24) {
    toast('Limite de 24 feiras atingido. Exclua uma no histórico.', 'error');
    return;
  }

  const nomeInput = document.getElementById('feira-nome').value.trim();
  const nome      = nomeInput || `Feira ${new Date().toLocaleDateString('pt-BR')}`;
  const items     = Object.values(allItems);
  const total     = items.reduce((s, i) => s + (i.preco * (i.quantidade || 1)), 0);
  const comprados = items.filter(i => i.comprado).length;

  try {
    const feiRef  = doc(collection(db, FEIRAS_COL));
    const batch   = writeBatch(db);

    batch.set(feiRef, {
      nome,
      data:       serverTimestamp(),
      total,
      totalItens: items.length,
      comprados,
      uid:        currentUser.uid
    });

    // Snapshot dos itens
    for (const item of items) {
      const iRef = doc(collection(db, FEIRAS_COL, feiRef.id, ITEMS_SUB));
      batch.set(iRef, { ...item });
    }

    // Resetar lista (desmarcar comprados, zerar preços)
    const listCol = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
    for (const item of items) {
      batch.update(doc(listCol, item.id), { comprado: false, preco: 0 });
    }

    await batch.commit();
    toast(`Feira "${nome}" salva com sucesso! ✅`, 'success');
    closeModal('save-modal');
  } catch(e) {
    console.error(e);
    toast('Erro ao salvar feira.', 'error');
  }
}

// ── Reiniciar lista ────────────────────────────────────────────────────────
async function resetLista() {
  const batch = writeBatch(db);
  const col   = collection(db, FEIRA_COL, 'lista', ITEMS_SUB);
  for (const item of Object.values(allItems)) {
    batch.update(doc(col, item.id), { comprado: false, preco: 0 });
  }
  await batch.commit();
  toast('Lista reiniciada!', 'success');
  closeModal('reset-modal');
}

// ── Footer ─────────────────────────────────────────────────────────────────
function updateFooter() {
  const items     = Object.values(allItems);
  const comprados = items.filter(i => i.comprado);
  const total     = items.reduce((s, i) => s + (i.preco * (i.quantidade || 1)), 0);
  const totalComp = comprados.reduce((s, i) => s + (i.preco * (i.quantidade || 1)), 0);

  document.getElementById('total-geral').textContent    = fmt(total);
  document.getElementById('total-itens').textContent    = `${comprados.length} / ${items.length}`;
  document.getElementById('total-comprado').textContent = fmt(totalComp);
  document.getElementById('total-restante').textContent = fmt(total - totalComp);
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function buildSidebar() {
  const sb = document.getElementById('sidebar');
  sb.innerHTML = '';
  for (const cat of categorias) {
    const a = document.createElement('a');
    a.href          = `#cat-${cat.id}`;
    a.className     = 'sidebar-item';
    a.dataset.cat   = cat.id;
    a.innerHTML     = `
      <span class="cat-icon">${cat.icone}</span>
      <span class="cat-name">${cat.nome}</span>
      <span class="cat-count" id="sb-${cat.id}">0</span>
    `;
    a.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
      a.classList.add('active');
      const block = document.querySelector(`.category-block[data-cat="${cat.id}"]`);
      if (block) block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    sb.appendChild(a);
  }
}

function updateSidebarCounts() {
  for (const cat of categorias) {
    const el = document.getElementById(`sb-${cat.id}`);
    if (!el) continue;
    const count = Object.values(allItems).filter(i => i.categoria === cat.id && !i.comprado).length;
    el.textContent = count;
  }
}

function populateCategorySelect() {
  const sel = document.getElementById('edit-categoria');
  sel.innerHTML = '';
  for (const cat of categorias) {
    const opt = document.createElement('option');
    opt.value       = cat.id;
    opt.textContent = `${cat.icone} ${cat.nome}`;
    sel.appendChild(opt);
  }
}

// ── Eventos ────────────────────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

function bindEvents() {
  // Filtros — começa com "pendentes" ativo
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });
  // Marcar filtro inicial como ativo
  const initialChip = document.querySelector(`.filter-chip[data-filter="${currentFilter}"]`);
  if (initialChip) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    initialChip.classList.add('active');
  }

  // Busca — sincroniza os dois inputs (desktop e mobile)
  function handleSearch(value) {
    searchQuery = value.trim();
    const d = document.getElementById('search-input');
    const m = document.getElementById('search-input-mobile');
    if (d && d.value !== value) d.value = value;
    if (m && m.value  !== value) m.value  = value;
    render();
  }
  const _sd = document.getElementById('search-input');
  const _sm = document.getElementById('search-input-mobile');
  if (_sd) _sd.addEventListener('input', e => handleSearch(e.target.value));
  if (_sm) _sm.addEventListener('input', e => handleSearch(e.target.value));

  // Expandir/colapsar tudo
  el('expand-all-btn')?.addEventListener('click', () => {
    allCollapsed = !allCollapsed;
    document.querySelectorAll('.category-block').forEach(b => {
      b.classList.toggle('collapsed', allCollapsed);
    });
    if(el('expand-all-btn')) el('expand-all-btn').textContent = allCollapsed ? '📂 Categorias' : '📂 Categorias';
  });

  // FAB
  el('add-item-fab')?.addEventListener('click', () => openEditModal(null));

  // Modais
  el('close-modal')?.addEventListener('click', () => closeModal('edit-modal'));
  el('cancel-modal')?.addEventListener('click', () => closeModal('edit-modal'));
  el('save-item-btn')?.addEventListener('click', saveItem);

  el('save-feira-btn')?.addEventListener('click', () => {
    if(el('feira-nome')) el('feira-nome').value = `Feira ${new Date().toLocaleDateString('pt-BR')}`;
    el('save-modal')?.classList.remove('hidden');
  });
  el('close-save-modal')?.addEventListener('click', () => closeModal('save-modal'));
  el('cancel-save-modal')?.addEventListener('click', () => closeModal('save-modal'));
  el('confirm-save-feira')?.addEventListener('click', saveFeira);

  // reset-btn removido da interface — modal de reset não é mais acessível pelo footer
  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn) resetBtn.addEventListener('click', () => document.getElementById('reset-modal').classList.remove('hidden'));
  const closeResetModal = document.getElementById('close-reset-modal');
  if (closeResetModal) closeResetModal.addEventListener('click', () => closeModal('reset-modal'));
  const cancelResetModal = document.getElementById('cancel-reset-modal');
  if (cancelResetModal) cancelResetModal.addEventListener('click', () => closeModal('reset-modal'));
  const confirmReset = document.getElementById('confirm-reset');
  if (confirmReset) confirmReset.addEventListener('click', resetLista);

  el('user-chip')?.addEventListener('click', () => el('user-modal')?.classList.remove('hidden'));
  el('close-user-modal')?.addEventListener('click', () => closeModal('user-modal'));
  el('logout-btn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
  });

  // Fechar modal ao clicar fora
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  // Enter no modal de edição
  el('edit-nome')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveItem();
  });
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── Utilitários ────────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}