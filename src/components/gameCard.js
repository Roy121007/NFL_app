import { buscarInfoEquipo } from '../data/teams.js';

/**
 * Componente para crear y devolver la tarjeta HTML de un partido.
 * Pro: Posesión, récords, barras bicolor, animación de Touchdown y Odómetro de marcador.
 */

// Track scoring plays per game to detect new touchdowns
const scoringPlayCounts = {};

/**
 * Renderiza la estructura HTML de un odómetro con efecto ruleta vertical.
 */
export function renderizarOdometro(valor) {
  const str = String(valor ?? '-');
  if (isNaN(valor) || valor === null || valor === undefined || valor === '-') {
    return `<span class="odometer" data-score="${str}"><span class="odometer-char">${str}</span></span>`;
  }

  const digitos = str.split('');
  let html = `<span class="odometer" data-score="${str}" aria-label="${str}">`;
  digitos.forEach(d => {
    const num = parseInt(d, 10);
    const offset = isNaN(num) ? 0 : num * 10;
    html += `
      <span class="odometer-digit" aria-hidden="true">
        <span class="odometer-ribbon" style="transform: translateY(-${offset}%);" data-digit="${d}">
          <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span>
          <span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
        </span>
      </span>
    `;
  });
  html += `</span>`;
  return html;
}

/**
 * Actualiza suavemente las cintas del odómetro hacia el nuevo valor numérico con efecto ruleta.
 */
export function actualizarElementoOdometro(contenedor, nuevoValor) {
  if (!contenedor) return;
  const nuevoStr = String(nuevoValor ?? '-');
  const valorActual = contenedor.getAttribute('data-score');
  if (valorActual === nuevoStr) return;

  contenedor.setAttribute('data-score', nuevoStr);
  contenedor.setAttribute('aria-label', nuevoStr);

  if (isNaN(nuevoValor) || nuevoValor === null || nuevoValor === undefined || nuevoValor === '-') {
    contenedor.innerHTML = `<span class="odometer-char">${nuevoStr}</span>`;
    return;
  }

  const nuevosDigitos = nuevoStr.split('');
  let digitElements = contenedor.querySelectorAll('.odometer-digit');

  // Si la cantidad de dígitos cambió o había un carácter estático, regenerar estructura
  if (digitElements.length !== nuevosDigitos.length || contenedor.querySelector('.odometer-char')) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderizarOdometro(nuevoValor);
    const nuevoNodo = tempDiv.firstElementChild;
    contenedor.replaceWith(nuevoNodo);
    return;
  }

  nuevosDigitos.forEach((d, idx) => {
    const ribbon = digitElements[idx]?.querySelector('.odometer-ribbon');
    if (ribbon) {
      const num = parseInt(d, 10);
      const offset = isNaN(num) ? 0 : num * 10;
      ribbon.style.transform = `translateY(-${offset}%)`;
      ribbon.setAttribute('data-digit', d);
    }
  });
}

export function crearTarjetaPartido(game, teams, onCardClick) {
  const card = document.createElement('div');
  card.className = `game-card ${game.redZone ? 'red-zone-alert' : ''}`;
  card.setAttribute('data-game-id', game.id);

  // Búsqueda robusta de equipos (por nombre, abreviatura o clave)
  const homeTeamInfo = buscarInfoEquipo(game.home) || buscarInfoEquipo(game.homeAbbrev) || (teams && teams[game.homeAbbrev]) || {};
  const awayTeamInfo = buscarInfoEquipo(game.away) || buscarInfoEquipo(game.awayAbbrev) || (teams && teams[game.awayAbbrev]) || {};

  // Extraer probabilidades con valores seguros por defecto
  const homeWinProb = game.winProbability?.home ?? 50;
  const awayWinProb = game.winProbability?.away ?? (100 - homeWinProb);

  // Formato del badge de estado
  let statusBadgeClass = 'upcoming';
  if (game.status === 'LIVE') statusBadgeClass = 'live';
  if (game.status === 'FINAL') statusBadgeClass = 'final';

  // =============================================
  // PRO 1: Posesión & Récords
  // =============================================
  const homePossession = game.possession && game.homeTeamId && game.possession === game.homeTeamId;
  const awayPossession = game.possession && game.awayTeamId && game.possession === game.awayTeamId;

  const awayPossIcon = (awayPossession && game.status === 'LIVE') ? '<span class="possession-icon">🏈</span>' : '';
  const homePossIcon = (homePossession && game.status === 'LIVE') ? '<span class="possession-icon">🏈</span>' : '';

  const awayRecordHtml = game.awayRecord ? `<span class="team-record">(${game.awayRecord})</span>` : '';
  const homeRecordHtml = game.homeRecord ? `<span class="team-record">(${game.homeRecord})</span>` : '';

  // =============================================
  // PRO 2: Colores bicolor para barras de probabilidad
  // =============================================
  const awayBarColor = awayTeamInfo.primaryColor || game.awayColor || 'var(--secondary-theme)';
  const homeBarColor = homeTeamInfo.primaryColor || game.homeColor || 'var(--primary-theme)';

  // =============================================
  // PRO 3: Touchdown detection
  // =============================================
  let touchdownOverlay = '';
  const prevCount = scoringPlayCounts[game.id] || 0;
  const currentCount = game.totalScoringPlays || 0;

  if (currentCount > prevCount && prevCount > 0 && game.lastScoringPlay) {
    const sp = game.lastScoringPlay;
    const isTouchdown = sp.type && sp.type.toLowerCase().includes('touchdown');
    
    if (isTouchdown) {
      // Determine which team scored
      const scoringTeamAbbrev = sp.team || '';
      const isHome = scoringTeamAbbrev === game.homeAbbrev;
      const scoringTeamInfo = isHome ? homeTeamInfo : awayTeamInfo;
      const scoringLogo = isHome ? game.homeLogo : game.awayLogo;
      const scoringFullName = isHome ? (game.homeFullName || game.home) : (game.awayFullName || game.away);
      const bgColor = scoringTeamInfo.primaryColor || (isHome ? game.homeColor : game.awayColor) || '#ff6600';

      touchdownOverlay = `
        <div class="td-overlay active" style="background-color: ${bgColor};">
          <img src="${scoringLogo}" alt="${scoringTeamAbbrev}" class="td-logo" />
          <div class="td-title">¡TOUCHDOWN!</div>
          <div class="td-detail">${scoringTeamAbbrev} ${scoringFullName}</div>
          ${sp.text ? `<div class="td-detail">${sp.text}</div>` : ''}
        </div>
      `;
    }
  }

  // Update the count tracker
  scoringPlayCounts[game.id] = currentCount;

  card.innerHTML = `
    ${touchdownOverlay}
    <div class="card-header">
      <span class="status-badge ${statusBadgeClass}">${game.statusDetail}</span>
      ${game.redZone ? '<span style="color: var(--accent-redzone); font-weight: bold;">🔴 RED ZONE</span>' : ''}
    </div>

    <!-- Equipo Visitante -->
    <div class="team-row">
      <div class="team-info">
        <img src="${game.awayLogo}" alt="${game.away}" class="team-logo" />
        <div class="team-name-wrapper">
          <div class="team-name-line">
            <span class="team-name">${game.awayAbbrev || game.away}</span>
            ${awayPossIcon}
          </div>
          ${awayRecordHtml}
        </div>
      </div>
      <span class="team-score away-score">${renderizarOdometro(game.status === 'UPCOMING' ? '-' : game.awayScore)}</span>
    </div>

    <div class="vs-divider">VS</div>

    <!-- Equipo Local -->
    <div class="team-row">
      <div class="team-info">
        <img src="${game.homeLogo}" alt="${game.home}" class="team-logo" />
        <div class="team-name-wrapper">
          <div class="team-name-line">
            <span class="team-name">${game.homeAbbrev || game.home}</span>
            ${homePossIcon}
          </div>
          ${homeRecordHtml}
        </div>
      </div>
      <span class="team-score home-score">${renderizarOdometro(game.status === 'UPCOMING' ? '-' : game.homeScore)}</span>
    </div>

    <!-- Barra de Probabilidad de Victoria BICOLOR -->
    <div class="win-prob-container">
      <div class="win-prob-bar away" style="width: ${awayWinProb}%; background-color: ${awayBarColor};"></div>
      <div class="win-prob-bar home" style="width: ${homeWinProb}%; background-color: ${homeBarColor};"></div>
    </div>
    <div class="win-prob-labels">
      <span>${game.awayAbbrev}: ${awayWinProb}%</span>
      <span>${game.homeAbbrev}: ${homeWinProb}%</span>
    </div>
  `;

  // Remove TD overlay after animation completes (~5s)
  if (touchdownOverlay) {
    setTimeout(() => {
      const overlay = card.querySelector('.td-overlay');
      if (overlay) overlay.remove();
    }, 5500);
  }

  // Evento al hacer clic en la tarjeta
  card.addEventListener('click', () => {
    if (onCardClick) {
      onCardClick(game, homeTeamInfo, awayTeamInfo);
    }
  });

  return card;
}
