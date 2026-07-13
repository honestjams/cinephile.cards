/* Cinephile Cards — create, manage and export trading cards for the
   movie guessing game. */
(() => {
  'use strict';

  const EXPORT_WIDTH = 750;            // px — 300 DPI at poker size (2.5in)
  const CARD_BASE_WIDTH = 320;         // px — the CSS design width
  const EXPORT_SCALE = EXPORT_WIDTH / CARD_BASE_WIDTH;
  const CARD_MM = { w: 63.5, h: 88.9 }; // physical poker-card size

  const grid = document.getElementById('card-grid');
  const stage = document.getElementById('export-stage');
  const searchInput = document.getElementById('search-input');
  const deckCount = document.getElementById('deck-count');
  const emptyState = document.getElementById('empty-state');

  let cards = [];
  let editingId = null;   // card id being edited in the modal, or null for new
  let modalImage = null;  // data URL chosen in the modal
  let directUploadId = null;

  /* ---------- Placeholder artwork (inline SVG data URI) ---------- */
  const PLACEHOLDER_SVG = (() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="310" viewBox="0 0 300 310">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1d2739"/><stop offset="1" stop-color="#0b101c"/>
      </linearGradient></defs>
      <rect width="300" height="310" fill="url(#g)"/>
      <g stroke="#c9a83c" stroke-width="6" fill="none" stroke-linejoin="round">
        <g transform="rotate(-14 90 118)">
          <rect x="88" y="100" width="124" height="30" rx="4"/>
          <line x1="112" y1="102" x2="126" y2="128"/>
          <line x1="140" y1="102" x2="154" y2="128"/>
          <line x1="168" y1="102" x2="182" y2="128"/>
        </g>
        <rect x="88" y="136" width="124" height="84" rx="6"/>
      </g>
      <text x="150" y="262" text-anchor="middle" fill="#8d94a3" font-family="Georgia, serif" font-size="15" letter-spacing="4">ADD SCENE PHOTO</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s+/g, ' '));
  })();

  /* ---------- Card DOM ---------- */
  function fitActorSize(text) {
    const n = text.length;
    if (n <= 14) return 26;
    if (n <= 18) return 23;
    if (n <= 24) return 20;
    if (n <= 30) return 17;
    return 15;
  }
  function fitMovieSize(text) {
    const n = text.length;
    if (n <= 16) return 24;
    if (n <= 26) return 20;
    if (n <= 40) return 17;
    return 14.5;
  }
  const pad2 = n => String(n).padStart(2, '0');
  const sprocketTrack = () =>
    `<div class="cc-sprocket-track">${'<div class="hole"></div>'.repeat(12)}</div>`;

  function buildCardNode(card) {
    const el = document.createElement('div');
    el.className = 'cine-card';
    el.innerHTML = `
      <div class="cine-card-inner">
        <div class="cc-top">
          <span>CINEPHILE</span>
          <span class="cc-num">N&ordm; ${pad2(card.num)}</span>
        </div>
        <div class="cc-actor"></div>
        <div class="cc-frame">
          <div class="cc-sprockets">${sprocketTrack()}</div>
          <div class="cc-photo"><img alt=""></div>
          <div class="cc-sprockets">${sprocketTrack()}</div>
        </div>
        <div class="cc-divider"><span class="line"></span><span class="star">&#9733;</span><span class="line"></span></div>
        <div class="cc-featured">FEATURED IN</div>
        <div class="cc-movie"></div>
        <div class="cc-bottom">THE MOVIE GUESSING GAME</div>
      </div>`;

    const actorEl = el.querySelector('.cc-actor');
    actorEl.textContent = card.actor.toUpperCase();
    actorEl.style.fontSize = fitActorSize(card.actor) + 'px';

    const movieEl = el.querySelector('.cc-movie');
    movieEl.textContent = card.movie;
    movieEl.style.fontSize = fitMovieSize(card.movie) + 'px';

    const photo = el.querySelector('.cc-photo');
    const img = photo.querySelector('img');
    if (card.image) {
      img.src = card.image;
    } else {
      img.src = PLACEHOLDER_SVG;
      photo.classList.add('is-placeholder');
    }
    return el;
  }

  /* ---------- Grid rendering ---------- */
  function visibleCards() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(c =>
      c.actor.toLowerCase().includes(q) || c.movie.toLowerCase().includes(q));
  }

  function render() {
    grid.innerHTML = '';
    const list = visibleCards();
    for (const card of list) {
      const slot = document.createElement('div');
      slot.className = 'card-slot';
      const node = buildCardNode(card);

      const photo = node.querySelector('.cc-photo');
      if (photo.classList.contains('is-placeholder')) {
        photo.title = 'Add the actor’s movie photo';
        photo.addEventListener('click', () => pickDirectImage(card.id));
      }

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.innerHTML = `
        <button data-act="photo">Photo</button>
        <button data-act="edit">Edit</button>
        <button data-act="png">PNG</button>
        <button data-act="pdf">PDF</button>
        <button data-act="del" class="action-delete">✕</button>`;
      actions.addEventListener('click', e => {
        const act = e.target.dataset.act;
        if (act === 'photo') pickDirectImage(card.id);
        if (act === 'edit') openModal(card);
        if (act === 'png') exportCardPNG(card);
        if (act === 'pdf') exportCardPDF(card);
        if (act === 'del') deleteCard(card);
      });

      slot.append(node, actions);
      grid.appendChild(slot);
    }
    deckCount.textContent = `${cards.length} CARDS IN DECK`;
    emptyState.hidden = list.length !== 0;
  }

  /* ---------- Image helpers ---------- */
  function fileToResizedDataURL(file, maxDim = 1200) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not read image'));
        img.onload = () => {
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * ratio);
          canvas.height = Math.round(img.height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.87));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  const directInput = document.getElementById('direct-image-input');
  function pickDirectImage(cardId) {
    directUploadId = cardId;
    directInput.value = '';
    directInput.click();
  }
  directInput.addEventListener('change', async () => {
    const file = directInput.files[0];
    if (!file || !directUploadId) return;
    const card = cards.find(c => c.id === directUploadId);
    if (!card) return;
    try {
      card.image = await fileToResizedDataURL(file);
      await DB.put(card);
      render();
      toast(`Photo added to ${card.actor}`);
    } catch (err) {
      toast('Sorry, that image could not be read.');
    }
  });

  /* ---------- Modal (create / edit) ---------- */
  const backdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const fieldActor = document.getElementById('field-actor');
  const fieldMovie = document.getElementById('field-movie');
  const fieldImage = document.getElementById('field-image');
  const imageDrop = document.getElementById('image-drop');
  const imagePreview = document.getElementById('image-preview');
  const imageDropText = document.getElementById('image-drop-text');

  function openModal(card) {
    editingId = card ? card.id : null;
    modalTitle.textContent = card ? `Edit Card Nº ${pad2(card.num)}` : 'New Card';
    fieldActor.value = card ? card.actor : '';
    fieldMovie.value = card ? card.movie : '';
    modalImage = card ? card.image : null;
    refreshPreview();
    backdrop.hidden = false;
    fieldActor.focus();
  }
  function closeModal() { backdrop.hidden = true; }
  function refreshPreview() {
    if (modalImage) {
      imagePreview.src = modalImage;
      imagePreview.hidden = false;
      imageDropText.textContent = 'Click or drop to replace the image';
    } else {
      imagePreview.hidden = true;
      imageDropText.textContent = 'Click or drop an image here';
    }
  }
  async function handleModalFile(file) {
    if (!file) return;
    try {
      modalImage = await fileToResizedDataURL(file);
      refreshPreview();
    } catch (err) {
      toast('Sorry, that image could not be read.');
    }
  }

  imageDrop.addEventListener('click', () => fieldImage.click());
  imageDrop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fieldImage.click(); });
  fieldImage.addEventListener('change', () => handleModalFile(fieldImage.files[0]));
  imageDrop.addEventListener('dragover', e => { e.preventDefault(); imageDrop.classList.add('dragover'); });
  imageDrop.addEventListener('dragleave', () => imageDrop.classList.remove('dragover'));
  imageDrop.addEventListener('drop', e => {
    e.preventDefault();
    imageDrop.classList.remove('dragover');
    handleModalFile(e.dataTransfer.files[0]);
  });

  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !backdrop.hidden) closeModal(); });

  document.getElementById('card-form').addEventListener('submit', async e => {
    e.preventDefault();
    const actor = fieldActor.value.trim();
    const movie = fieldMovie.value.trim();
    if (!actor || !movie) return;

    if (editingId) {
      const card = cards.find(c => c.id === editingId);
      Object.assign(card, { actor, movie, image: modalImage });
      await DB.put(card);
      toast('Card updated');
    } else {
      const card = {
        id: 'user-' + Date.now(),
        num: cards.reduce((m, c) => Math.max(m, c.num), 0) + 1,
        actor, movie,
        image: modalImage,
      };
      cards.push(card);
      await DB.put(card);
      toast(`Card Nº ${pad2(card.num)} added to the deck`);
    }
    closeModal();
    render();
  });

  document.getElementById('btn-new-card').addEventListener('click', () => openModal(null));

  async function deleteCard(card) {
    if (!confirm(`Delete card Nº ${pad2(card.num)} — ${card.actor} (${card.movie})?`)) return;
    cards = cards.filter(c => c.id !== card.id);
    await DB.remove(card.id);
    render();
    toast('Card deleted');
  }

  /* ---------- Export ---------- */
  function slugFilename(card) {
    const slug = card.actor.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `cinephile-${pad2(card.num)}-${slug}`;
  }

  async function renderCardToCanvas(card, scale = EXPORT_SCALE) {
    const node = buildCardNode(card);
    stage.appendChild(node);
    try {
      await document.fonts.ready;
      const img = node.querySelector('.cc-photo img');
      if (img && !img.complete) {
        await new Promise(res => { img.onload = res; img.onerror = res; });
      }
      return await html2canvas(node, {
        scale,
        backgroundColor: null,
        logging: false,
      });
    } finally {
      node.remove();
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function exportCardPNG(card) {
    toast('Rendering PNG…');
    try {
      const canvas = await renderCardToCanvas(card);
      canvas.toBlob(blob => downloadBlob(blob, slugFilename(card) + '.png'), 'image/png');
    } catch (err) {
      console.error(err);
      toast('PNG export failed.');
    }
  }

  async function exportCardPDF(card) {
    toast('Rendering PDF…');
    try {
      const canvas = await renderCardToCanvas(card);
      const pdf = new window.jspdf.jsPDF({
        orientation: 'portrait', unit: 'mm', format: [CARD_MM.w, CARD_MM.h],
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', 0, 0, CARD_MM.w, CARD_MM.h);
      pdf.save(slugFilename(card) + '.pdf');
    } catch (err) {
      console.error(err);
      toast('PDF export failed.');
    }
  }

  /* Batch exports with a progress bar */
  const overlay = document.getElementById('progress-overlay');
  const progressFill = document.getElementById('progress-fill');
  const progressDetail = document.getElementById('progress-detail');
  const progressTitle = document.getElementById('progress-title');

  function showProgress(title) {
    progressTitle.textContent = title;
    progressFill.style.width = '0%';
    progressDetail.textContent = '';
    overlay.hidden = false;
  }
  async function stepProgress(i, total, label) {
    progressFill.style.width = Math.round(((i + 1) / total) * 100) + '%';
    progressDetail.textContent = label;
    await new Promise(r => setTimeout(r, 0)); // let the bar paint
  }

  async function exportAllPDF() {
    if (!cards.length) return;
    showProgress('Building print sheet…');
    try {
      const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PAGE = { w: 210, h: 297 };
      const COLS = 3, ROWS = 3, GAP = 3;
      const marginX = (PAGE.w - COLS * CARD_MM.w - (COLS - 1) * GAP) / 2;
      const marginY = (PAGE.h - ROWS * CARD_MM.h - (ROWS - 1) * GAP) / 2;

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        await stepProgress(i, cards.length, `Card ${pad2(card.num)} — ${card.actor}`);
        const canvas = await renderCardToCanvas(card, 600 / CARD_BASE_WIDTH);
        const slot = i % (COLS * ROWS);
        if (i > 0 && slot === 0) pdf.addPage();
        const x = marginX + (slot % COLS) * (CARD_MM.w + GAP);
        const y = marginY + Math.floor(slot / COLS) * (CARD_MM.h + GAP);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', x, y, CARD_MM.w, CARD_MM.h);
      }
      pdf.save('cinephile-deck.pdf');
      toast('Deck PDF saved — cards are print-ready at real size.');
    } catch (err) {
      console.error(err);
      toast('Deck PDF export failed.');
    } finally {
      overlay.hidden = true;
    }
  }

  async function exportAllPNG() {
    if (!cards.length) return;
    showProgress('Rendering PNGs…');
    try {
      const zip = new JSZip();
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        await stepProgress(i, cards.length, `Card ${pad2(card.num)} — ${card.actor}`);
        const canvas = await renderCardToCanvas(card);
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        zip.file(slugFilename(card) + '.png', blob);
      }
      progressDetail.textContent = 'Compressing…';
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, 'cinephile-deck-png.zip');
      toast('Deck PNGs saved as a zip.');
    } catch (err) {
      console.error(err);
      toast('PNG export failed.');
    } finally {
      overlay.hidden = true;
    }
  }

  /* ---------- Export dropdown ---------- */
  const dropdown = document.getElementById('export-dropdown');
  document.getElementById('btn-export-menu').addEventListener('click', e => {
    e.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });
  document.addEventListener('click', () => { dropdown.hidden = true; });
  document.getElementById('btn-export-all-pdf').addEventListener('click', exportAllPDF);
  document.getElementById('btn-export-all-png').addEventListener('click', exportAllPNG);

  /* ---------- Misc ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  searchInput.addEventListener('input', render);

  /* ---------- Init ---------- */
  (async function init() {
    let stored = [];
    try {
      stored = await DB.getAll();
      if (!stored.length) {
        await DB.putMany(PRELOADED_CARDS);
        stored = PRELOADED_CARDS;
      }
    } catch (err) {
      console.error('IndexedDB unavailable, running without persistence', err);
      stored = PRELOADED_CARDS;
    }
    cards = stored.sort((a, b) => a.num - b.num);
    render();
  })();
})();
