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

  /* ---------- Customisation presets ---------- */
  const THEMES = {
    gold:     { name: 'Gold',      accent: '#d4af37', bright: '#f3d878', deep: '#8a6d1f' },
    silver:   { name: 'Silver',    accent: '#aeb6c2', bright: '#eef1f6', deep: '#636b78' },
    rose:     { name: 'Rose gold', accent: '#c98d80', bright: '#f0cec2', deep: '#84544a' },
    emerald:  { name: 'Emerald',   accent: '#43a06c', bright: '#9fe4bd', deep: '#1f5c3a' },
    sapphire: { name: 'Sapphire',  accent: '#5b86d8', bright: '#b3cbf5', deep: '#2b4a8c' },
    crimson:  { name: 'Crimson',   accent: '#c45555', bright: '#f0a8a8', deep: '#762a2a' },
  };
  const BACKGROUNDS = {
    midnight: { name: 'Midnight', light: false,
      panel: 'linear-gradient(160deg,#182030 0%,#0e1420 45%,#0a0e17 100%)',
      photo: ['#1d2739', '#0b101c'], frame: '#05070c',
      text: '#f0ede4', dim: '#8d94a3', faint: '#6d7482' },
    noir: { name: 'Noir', light: false,
      panel: 'linear-gradient(160deg,#232326 0%,#131316 45%,#0a0a0c 100%)',
      photo: ['#28282c', '#101013'], frame: '#050506',
      text: '#efefec', dim: '#9a9aa2', faint: '#727279' },
    burgundy: { name: 'Burgundy', light: false,
      panel: 'linear-gradient(160deg,#3a1520 0%,#220a12 45%,#140609 100%)',
      photo: ['#411a28', '#170810'], frame: '#0a0306',
      text: '#f4e9e6', dim: '#b39399', faint: '#8a686e' },
    forest: { name: 'Forest', light: false,
      panel: 'linear-gradient(160deg,#14301f 0%,#0b1d12 45%,#06110a 100%)',
      photo: ['#1a3a27', '#0b1a11'], frame: '#030905',
      text: '#eaf2e9', dim: '#93ac97', faint: '#6d8471' },
    royal: { name: 'Royal', light: false,
      panel: 'linear-gradient(160deg,#291d43 0%,#170f2b 45%,#0d081a 100%)',
      photo: ['#2f2350', '#140d29'], frame: '#070311',
      text: '#efeaf6', dim: '#a297bd', faint: '#78708f' },
    ivory: { name: 'Ivory', light: true,
      panel: 'linear-gradient(160deg,#faf5ea 0%,#f0e7d3 55%,#e6d9bd 100%)',
      photo: ['#efe7d6', '#dfd3b8'], frame: '#cdbf9f',
      text: '#33291a', dim: '#8a7c5c', faint: '#a4977a' },
  };
  const FONTS = {
    cinzel:   { family: "'Cinzel', serif", weight: 900, italic: false },
    playfair: { family: "'Playfair Display', Georgia, serif", weight: 600, italic: true },
    georgia:  { family: "Georgia, 'Times New Roman', serif", weight: 700, italic: true },
    modern:   { family: "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif", weight: 800, italic: false },
  };
  const DEFAULT_STYLE = {
    theme: 'gold', bg: 'midnight',
    nameFont: 'cinzel', titleFont: 'playfair',
    photoFit: 'cover', photoPos: 'center', sprockets: true,
    brand: 'CINEPHILE', label: 'FEATURED IN', footer: 'THE MOVIE GUESSING GAME',
  };
  const styleOf = card => ({ ...DEFAULT_STYLE, ...(card.style || {}) });
  const themeOf = s => THEMES[s.theme] || THEMES.gold;
  const bgOf = s => BACKGROUNDS[s.bg] || BACKGROUNDS.midnight;
  const foil = t =>
    `linear-gradient(135deg, ${t.deep} 0%, ${t.bright} 22%, ${t.accent} 45%, ${t.bright} 62%, ${t.accent} 78%, ${t.deep} 100%)`;

  /* ---------- Placeholder artwork (inline SVG data URI) ---------- */
  function placeholderSvg(t, bg) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="310" viewBox="0 0 300 310">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg.photo[0]}"/><stop offset="1" stop-color="${bg.photo[1]}"/>
      </linearGradient></defs>
      <rect width="300" height="310" fill="url(#g)"/>
      <g stroke="${t.accent}" stroke-width="6" fill="none" stroke-linejoin="round">
        <g transform="rotate(-14 90 118)">
          <rect x="88" y="100" width="124" height="30" rx="4"/>
          <line x1="112" y1="102" x2="126" y2="128"/>
          <line x1="140" y1="102" x2="154" y2="128"/>
          <line x1="168" y1="102" x2="182" y2="128"/>
        </g>
        <rect x="88" y="136" width="124" height="84" rx="6"/>
      </g>
      <text x="150" y="262" text-anchor="middle" fill="${bg.dim}" font-family="Georgia, serif" font-size="15" letter-spacing="4">ADD SCENE PHOTO</text>
    </svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s+/g, ' '));
  }

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
    const s = styleOf(card);
    const t = themeOf(s);
    const bg = bgOf(s);
    const nameFont = FONTS[s.nameFont] || FONTS.cinzel;
    const titleFont = FONTS[s.titleFont] || FONTS.playfair;

    const el = document.createElement('div');
    el.className = 'cine-card';
    el.innerHTML = `
      <div class="cine-card-inner">
        <div class="cc-top">
          <span class="cc-brand"></span>
          <span class="cc-num">N&ordm; ${pad2(card.num)}</span>
        </div>
        <div class="cc-actor"></div>
        <div class="cc-frame">
          <div class="cc-sprockets">${sprocketTrack()}</div>
          <div class="cc-photo"><img alt=""></div>
          <div class="cc-sprockets">${sprocketTrack()}</div>
        </div>
        <div class="cc-divider"><span class="line l1"></span><span class="star">&#9733;</span><span class="line l2"></span></div>
        <div class="cc-featured"></div>
        <div class="cc-movie"></div>
        <div class="cc-bottom"></div>
      </div>`;

    // Frame + panel colours
    el.style.background = foil(t);
    const inner = el.querySelector('.cine-card-inner');
    inner.style.background = bg.panel;
    inner.style.borderColor = t.bright + '59';

    const brand = el.querySelector('.cc-brand');
    brand.textContent = s.brand;
    el.querySelector('.cc-top').style.color = t.accent;

    const numEl = el.querySelector('.cc-num');
    numEl.style.borderColor = t.accent + '8c';
    numEl.style.background = t.accent + '14';
    numEl.style.color = bg.light ? t.deep : t.bright;

    const actorEl = el.querySelector('.cc-actor');
    actorEl.textContent = card.actor.toUpperCase();
    actorEl.style.fontSize = fitActorSize(card.actor) + 'px';
    actorEl.style.fontFamily = nameFont.family;
    actorEl.style.fontWeight = nameFont.weight;
    actorEl.style.color = bg.light ? t.deep : t.bright;
    actorEl.style.textShadow = bg.light
      ? '0 1px 0 rgba(255,255,255,0.6)'
      : `0 1px 0 ${t.deep}, 0 2px 6px rgba(0,0,0,0.8)`;

    const frame = el.querySelector('.cc-frame');
    frame.style.background = bg.frame;
    frame.style.borderColor = t.accent + '80';
    el.querySelectorAll('.cc-sprockets').forEach(sp => {
      sp.style.background = bg.frame;
      sp.hidden = !s.sprockets;
    });
    el.querySelectorAll('.cc-sprocket-track .hole').forEach(h => { h.style.background = t.accent; });

    const photo = el.querySelector('.cc-photo');
    photo.style.background = `linear-gradient(150deg, ${bg.photo[0]}, ${bg.photo[1]})`;
    const img = photo.querySelector('img');
    if (card.image) {
      img.src = card.image;
      img.style.objectFit = s.photoFit;
      img.style.objectPosition = `center ${s.photoPos}`;
    } else {
      img.src = placeholderSvg(t, bg);
      photo.classList.add('is-placeholder');
    }

    el.querySelectorAll('.cc-divider .line').forEach(l => {
      l.style.background = `linear-gradient(90deg, transparent, ${t.accent}bf, transparent)`;
    });
    el.querySelector('.cc-divider .star').style.color = t.accent;

    const featured = el.querySelector('.cc-featured');
    featured.textContent = s.label;
    featured.style.color = bg.dim;

    const movieEl = el.querySelector('.cc-movie');
    movieEl.textContent = card.movie;
    movieEl.style.fontSize = fitMovieSize(card.movie) + 'px';
    movieEl.style.fontFamily = titleFont.family;
    movieEl.style.fontWeight = titleFont.weight;
    movieEl.style.fontStyle = titleFont.italic ? 'italic' : 'normal';
    movieEl.style.color = bg.text;
    movieEl.style.textShadow = bg.light ? 'none' : '0 2px 5px rgba(0,0,0,0.7)';

    const bottom = el.querySelector('.cc-bottom');
    bottom.textContent = s.footer;
    bottom.style.color = bg.faint;
    bottom.style.borderTopColor = t.accent + '38';
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
  const fieldNum = document.getElementById('field-num');
  const fieldNameFont = document.getElementById('field-name-font');
  const fieldTitleFont = document.getElementById('field-title-font');
  const fieldPhotoFit = document.getElementById('field-photo-fit');
  const fieldPhotoPos = document.getElementById('field-photo-pos');
  const fieldBrand = document.getElementById('field-brand');
  const fieldLabel = document.getElementById('field-label');
  const fieldFooter = document.getElementById('field-footer');
  const fieldSprockets = document.getElementById('field-sprockets');
  const fieldApplyAll = document.getElementById('field-apply-all');
  const themeSwatches = document.getElementById('theme-swatches');
  const bgSwatches = document.getElementById('bg-swatches');
  let selectedTheme = DEFAULT_STYLE.theme;
  let selectedBg = DEFAULT_STYLE.bg;

  function renderSwatches() {
    themeSwatches.innerHTML = '';
    for (const [key, t] of Object.entries(THEMES)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (key === selectedTheme ? ' selected' : '');
      b.style.background = foil(t);
      b.title = t.name;
      b.addEventListener('click', () => { selectedTheme = key; renderSwatches(); });
      themeSwatches.appendChild(b);
    }
    bgSwatches.innerHTML = '';
    for (const [key, bg] of Object.entries(BACKGROUNDS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (key === selectedBg ? ' selected' : '');
      b.style.background = bg.panel;
      b.title = bg.name;
      b.addEventListener('click', () => { selectedBg = key; renderSwatches(); });
      bgSwatches.appendChild(b);
    }
  }

  function openModal(card) {
    editingId = card ? card.id : null;
    modalTitle.textContent = card ? `Edit Card Nº ${pad2(card.num)}` : 'New Card';
    fieldActor.value = card ? card.actor : '';
    fieldMovie.value = card ? card.movie : '';
    modalImage = card ? card.image : null;

    const s = card ? styleOf(card) : { ...DEFAULT_STYLE };
    selectedTheme = s.theme;
    selectedBg = s.bg;
    fieldNameFont.value = s.nameFont;
    fieldTitleFont.value = s.titleFont;
    fieldPhotoFit.value = s.photoFit;
    fieldPhotoPos.value = s.photoPos;
    fieldBrand.value = s.brand;
    fieldLabel.value = s.label;
    fieldFooter.value = s.footer;
    fieldSprockets.checked = s.sprockets;
    fieldApplyAll.checked = false;
    fieldNum.value = card ? card.num : cards.reduce((m, c) => Math.max(m, c.num), 0) + 1;
    renderSwatches();

    refreshPreview();
    backdrop.hidden = false;
    fieldActor.focus();
  }

  function collectStyle() {
    return {
      theme: selectedTheme,
      bg: selectedBg,
      nameFont: fieldNameFont.value,
      titleFont: fieldTitleFont.value,
      photoFit: fieldPhotoFit.value,
      photoPos: fieldPhotoPos.value,
      sprockets: fieldSprockets.checked,
      brand: fieldBrand.value.trim() || DEFAULT_STYLE.brand,
      label: fieldLabel.value.trim(),
      footer: fieldFooter.value.trim(),
    };
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
    const style = collectStyle();
    const num = Math.max(1, parseInt(fieldNum.value, 10) ||
      cards.reduce((m, c) => Math.max(m, c.num), 0) + 1);

    if (editingId) {
      const card = cards.find(c => c.id === editingId);
      Object.assign(card, { actor, movie, num, image: modalImage, style });
      await DB.put(card);
      toast('Card updated');
    } else {
      const card = { id: 'user-' + Date.now(), num, actor, movie, image: modalImage, style };
      cards.push(card);
      await DB.put(card);
      toast(`Card Nº ${pad2(card.num)} added to the deck`);
    }

    if (fieldApplyAll.checked) {
      cards.forEach(c => { c.style = { ...style }; });
      await DB.putMany(cards);
      toast('Style applied to the whole deck');
    }

    cards.sort((a, b) => a.num - b.num);
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
