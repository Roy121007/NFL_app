/**
 * Maneja la visualización, apertura, navegación fluida y play-by-play del modal de partido.
 */
export function inicializarModal() {
  const modal = document.getElementById('game-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const modalBody = document.getElementById('modal-body');
  const prevBtn = document.getElementById('modal-prev-btn');
  const nextBtn = document.getElementById('modal-next-btn');

  const defaultLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';

  // Estado interno para la lista de partidos y navegación entre ellos
  let partidosActuales = [];
  let indiceActual = 0;
  let juegoVisualizadoId = null;

  // Cerrar al dar clic en la X
  if (closeBtn) {
    closeBtn.addEventListener('click', cerrarModal);
  }

  // Cerrar al dar clic fuera del contenido del modal
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        cerrarModal();
      }
    });
  }

  // Navegación con flechas laterales
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navegar(-1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navegar(1);
    });
  }

  // Navegación con teclado (Flechas izquierda/derecha y tecla Escape)
  document.addEventListener('keydown', (e) => {
    if (!modal || modal.classList.contains('hidden')) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navegar(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navegar(1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cerrarModal();
    }
  });

  function cerrarModal() {
    if (modal) {
      modal.classList.add('hidden');
    }
    document.body.classList.remove('modal-open');
    juegoVisualizadoId = null;
  }

  function navegar(delta) {
    if (!partidosActuales || partidosActuales.length === 0) return;
    indiceActual = (indiceActual + delta + partidosActuales.length) % partidosActuales.length;
    renderizarModal(partidosActuales[indiceActual]);
  }

  /**
   * Renderiza los detalles completos del partido seleccionado dentro del modal.
   * Cuenta con validaciones defensivas completas (datos?.campo || 'N/A') para evitar errores.
   */
  function renderizarModal(game) {
    if (!game || !modalBody) return;
    juegoVisualizadoId = game.id;

    // Actualizar visibilidad de botones de navegación si hay más de un partido
    const mostrarNavegacion = partidosActuales.length > 1;
    if (prevBtn) prevBtn.style.display = mostrarNavegacion ? 'flex' : 'none';
    if (nextBtn) nextBtn.style.display = mostrarNavegacion ? 'flex' : 'none';

    // Extracción segura de datos con valores por defecto garantizados
    const awayName = game.awayFullName || game.away || 'Visitante';
    const awayAbbr = game.awayAbbrev || 'VIS';
    const awayLogo = game.awayLogo || defaultLogo;
    const awayRecord = game.awayRecord ? `(${game.awayRecord})` : '';
    const awayScore = (game.status === 'UPCOMING') ? '-' : (game.awayScore ?? 0);

    const homeName = game.homeFullName || game.home || 'Local';
    const homeAbbr = game.homeAbbrev || 'LOC';
    const homeLogo = game.homeLogo || defaultLogo;
    const homeRecord = game.homeRecord ? `(${game.homeRecord})` : '';
    const homeScore = (game.status === 'UPCOMING') ? '-' : (game.homeScore ?? 0);

    const statusText = game.statusDetail || game.status || 'Programado';
    const isLive = game.status === 'LIVE';
    const isFinal = game.status === 'FINAL';
    const isRedZone = Boolean(game.redZone);

    // Cuartos seguros
    const quarters = game.quarters || {};
    const q1 = quarters.q1 || [0, 0];
    const q2 = quarters.q2 || [0, 0];
    const q3 = quarters.q3 || [0, 0];
    const q4 = quarters.q4 || [0, 0];

    // Status badge class
    let statusBadgeClass = 'upcoming';
    if (isLive) statusBadgeClass = 'live';
    if (isFinal) statusBadgeClass = 'final';

    // Construcción de la sección Play-by-Play (Última Jugada en vivo)
    let playByPlayHtml = '';
    if (isLive) {
      const situacion = game.downDistanceText || 'En juego';
      const jugada = game.lastPlay || 'Esperando inicio de la siguiente jugada...';
      const drive = game.driveDescription ? `<div class="pbp-drive"><strong>Serie ofensiva:</strong> ${game.driveDescription}</div>` : '';
      
      playByPlayHtml = `
        <div class="modal-pbp-section">
          <div class="pbp-header">
            <span class="pbp-title">🏈 Última Jugada</span>
            <span class="pbp-live-badge">🔴 EN VIVO</span>
          </div>
          <div class="pbp-situation">
            ${situacion} ${isRedZone ? ' • <span style="color: #ef4444; font-weight: bold;">🔴 ZONA ROJA</span>' : ''}
          </div>
          <div class="pbp-play-text" id="pbp-play-text">${jugada}</div>
          <div id="pbp-drive-container">${drive}</div>
        </div>
      `;
    } else if (isFinal) {
      const jugadaFinal = game.lastPlay || 
        (game.lastScoringPlay ? `Última anotación (${game.lastScoringPlay.team || ''}): ${game.lastScoringPlay.text || 'Anotación'}` : 'Partido concluido con éxito.');
      playByPlayHtml = `
        <div class="modal-pbp-section">
          <div class="pbp-header">
            <span class="pbp-title">🏈 Fin del Partido</span>
            <span class="status-badge final" style="font-size: 0.72rem;">FINAL</span>
          </div>
          <div class="pbp-play-text" id="pbp-play-text">${jugadaFinal}</div>
        </div>
      `;
    } else {
      playByPlayHtml = `
        <div class="modal-pbp-section">
          <div class="pbp-header">
            <span class="pbp-title">🏈 Jugada a Jugada</span>
            <span class="status-badge upcoming" style="font-size: 0.72rem;">PROGRAMADO</span>
          </div>
          <div class="pbp-play-text" style="font-style: italic; color: var(--text-secondary);">
            ${statusText}. El seguimiento en vivo de cada jugada estará disponible al dar la patada de inicio.
          </div>
        </div>
      `;
    }

    // Contador de partido en la lista (ej: 3 de 16)
    const contadorJuegos = mostrarNavegacion 
      ? `<div style="text-align: center; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 8px;">Partido ${indiceActual + 1} de ${partidosActuales.length}</div>` 
      : '';

    modalBody.innerHTML = `
      ${contadorJuegos}
      <div class="modal-header-teams">
        <div class="modal-team">
          <img src="${awayLogo}" alt="${awayName}" class="modal-logo" onerror="this.src='${defaultLogo}'" />
          <h3>${awayName}</h3>
          ${awayRecord ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${awayRecord}</div>` : ''}
          <span class="modal-score">${awayScore}</span>
        </div>

        <div class="modal-vs" style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span class="status-badge ${statusBadgeClass}">${statusText}</span>
          ${isRedZone ? '<span style="color: #ef4444; font-weight: bold; font-size: 0.75rem;">🔴 RED ZONE</span>' : ''}
          <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">VS</span>
        </div>

        <div class="modal-team">
          <img src="${homeLogo}" alt="${homeName}" class="modal-logo" onerror="this.src='${defaultLogo}'" />
          <h3>${homeName}</h3>
          ${homeRecord ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${homeRecord}</div>` : ''}
          <span class="modal-score">${homeScore}</span>
        </div>
      </div>

      <hr class="modal-divider" />

      <!-- PRO: SECCIÓN PLAY-BY-PLAY (ÚLTIMA JUGADA) -->
      ${playByPlayHtml}

      <hr class="modal-divider" />

      <h4 style="margin-bottom: 8px; font-size: 0.95rem;">Marcador por Cuartos</h4>
      <table class="quarters-table">
        <thead>
          <tr>
            <th style="text-align: left; padding-left: 8px;">Equipo</th>
            <th>Q1</th>
            <th>Q2</th>
            <th>Q3</th>
            <th>Q4</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: left; padding-left: 8px; font-weight: 600;">${awayAbbr}</td>
            <td>${q1[0] ?? 0}</td>
            <td>${q2[0] ?? 0}</td>
            <td>${q3[0] ?? 0}</td>
            <td>${q4[0] ?? 0}</td>
            <td><strong>${awayScore}</strong></td>
          </tr>
          <tr>
            <td style="text-align: left; padding-left: 8px; font-weight: 600;">${homeAbbr}</td>
            <td>${q1[1] ?? 0}</td>
            <td>${q2[1] ?? 0}</td>
            <td>${q3[1] ?? 0}</td>
            <td>${q4[1] ?? 0}</td>
            <td><strong>${homeScore}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    // Animación suave de transición
    modalBody.classList.remove('modal-content-fade');
    void modalBody.offsetWidth; // Forzar reflow del navegador
    modalBody.classList.add('modal-content-fade');

    // Consulta asíncrona de enriquecimiento para obtener el play-by-play detallado de ESPN si está en vivo o final
    if (game.id && (isLive || isFinal)) {
      enriquecerPlayByPlay(game.id);
    }
  }

  /**
   * Consulta el endpoint de resumen en vivo de ESPN para enriquecer el Play-by-Play
   * sin bloquear la apertura instantánea del modal.
   */
  async function enriquecerPlayByPlay(gameId) {
    try {
      const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${gameId}`);
      if (!res.ok) return;
      const data = await res.json();

      // Verificar que el usuario no haya navegado a otro partido mientras se completaba la petición
      if (juegoVisualizadoId !== gameId) return;

      const pbpEl = document.getElementById('pbp-play-text');
      const driveContainer = document.getElementById('pbp-drive-container');

      // Extraer última jugada de las series (drives)
      const currentDrive = data.drives?.current || (data.drives?.previous?.length ? data.drives.previous[data.drives.previous.length - 1] : null);
      if (currentDrive && currentDrive.plays && currentDrive.plays.length > 0) {
        const lastPlayObj = currentDrive.plays[currentDrive.plays.length - 1];
        if (lastPlayObj && lastPlayObj.text && pbpEl) {
          const clock = lastPlayObj.clock?.displayValue ? `(${lastPlayObj.clock.displayValue}) ` : '';
          pbpEl.textContent = `${clock}${lastPlayObj.text}`;
        }
      }

      if (currentDrive?.description && driveContainer && !driveContainer.innerHTML.trim()) {
        driveContainer.innerHTML = `<div class="pbp-drive"><strong>Serie ofensiva:</strong> ${currentDrive.description}</div>`;
      }
    } catch {
      // Si falla la consulta enriquecida, la información original del partido ya está visible
    }
  }

  /**
   * Abre el modal y configura la lista de partidos para permitir navegación fluida.
   * @param {Object} game - Objeto de datos del partido seleccionado
   * @param {Array} listaPartidos - Lista completa de partidos visibles para permitir navegar
   * @param {number} index - Índice del partido dentro de la lista
   */
  function abrirModal(game, listaPartidos = [], index = 0) {
    if (!game) return;

    if (Array.isArray(listaPartidos) && listaPartidos.length > 0) {
      partidosActuales = listaPartidos;
      const idx = partidosActuales.findIndex(p => p.id === game.id);
      indiceActual = (idx !== -1) ? idx : (typeof index === 'number' ? index : 0);
    } else {
      partidosActuales = [game];
      indiceActual = 0;
    }

    renderizarModal(partidosActuales[indiceActual] || game);
    if (modal) {
      modal.classList.remove('hidden');
      document.body.classList.add('modal-open');
    }
  }

  return { abrirModal, cerrarModal };
}
