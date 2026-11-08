import { teams, teamAbbrevMap, buscarInfoEquipo } from './data/teams.js';
import { obtenerPartidosNFL } from './data/api.js';
import { crearTarjetaPartido, actualizarElementoOdometro, obtenerOverlayTouchdown } from './components/gameCard.js';
import { inicializarModal } from './components/gameModal.js';
import { inicializarNavbar } from './components/navbar.js';
import { initThemeToggle, toggleTheme, getCurrentTheme } from './utils/theme.js';

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
const CURRENT_NFL_SEASON = new Date().getFullYear();

let todosLosPartidos = [];
let filtroEstadoActual = 'ALL';
let terminoBusqueda = '';
let semanaActual = null;
let pestañaProActual = 'partidos';
let standingsViewMode = 'division'; // 'division' o 'conference'
let standingDataCache = null;
let lideresTemporadaCache = null;
let equipoSeleccionadoCalendario = 'KC';
const cacheCalendarios = {};
let partidosSeleccionadosMultipantalla = new Set();
let filtroMultipantallaCrunch = false;

// Inicializar controlador del Modal con navegación fluida y play-by-play
const { abrirModal } = inicializarModal();

// ==========================================
// DICCIONARIOS Y CONFIGURACIÓN DIVISIONAL
// ==========================================
const nombresDivisiones = {
  'AFC East': 'AFC Este',
  'AFC North': 'AFC Norte',
  'AFC South': 'AFC Sur',
  'AFC West': 'AFC Oeste',
  'NFC East': 'NFC Este',
  'NFC North': 'NFC Norte',
  'NFC South': 'NFC Sur',
  'NFC West': 'NFC Oeste'
};

// Mapeo seguro de equipos a divisiones como respaldo defensivo
const divisionesEquiposFallback = {
  'Bills': 'AFC Este', 'Dolphins': 'AFC Este', 'Patriots': 'AFC Este', 'Jets': 'AFC Este',
  'Ravens': 'AFC Norte', 'Bengals': 'AFC Norte', 'Browns': 'AFC Norte', 'Steelers': 'AFC Norte',
  'Texans': 'AFC Sur', 'Colts': 'AFC Sur', 'Jaguars': 'AFC Sur', 'Titans': 'AFC Sur',
  'Broncos': 'AFC Oeste', 'Chiefs': 'AFC Oeste', 'Raiders': 'AFC Oeste', 'Chargers': 'AFC Oeste',
  'Cowboys': 'NFC Este', 'Giants': 'NFC Este', 'Eagles': 'NFC Este', 'Commanders': 'NFC Este',
  'Bears': 'NFC Norte', 'Lions': 'NFC Norte', 'Packers': 'NFC Norte', 'Vikings': 'NFC Norte',
  'Falcons': 'NFC Sur', 'Panthers': 'NFC Sur', 'Saints': 'NFC Sur', 'Buccaneers': 'NFC Sur',
  'Cardinals': 'NFC Oeste', 'Rams': 'NFC Oeste', '49ers': 'NFC Oeste', 'Seahawks': 'NFC Oeste'
};

// ==========================================
// SKELETON LOADERS (ESTADO DE CARGA VISUAL)
// ==========================================
/**
 * Renderiza tarjetas "fantasma" con efecto de brillo/pulso antes de resolver el fetch.
 */
function renderizarSkeletons(contenedor, cantidad = 8) {
  if (!contenedor) return;
  let html = '';
  for (let i = 0; i < cantidad; i++) {
    html += `
      <div class="game-card skeleton-card">
        <div class="card-header">
          <div class="skeleton-badge skeleton-box"></div>
        </div>
        <div class="team-row">
          <div class="team-info">
            <div class="skeleton-circle skeleton-box"></div>
            <div class="skeleton-line skeleton-box" style="width: 80px;"></div>
          </div>
          <div class="skeleton-score skeleton-box"></div>
        </div>
        <div class="vs-divider">
          <div class="skeleton-line skeleton-box" style="width: 24px; margin: 0 auto;"></div>
        </div>
        <div class="team-row">
          <div class="team-info">
            <div class="skeleton-circle skeleton-box"></div>
            <div class="skeleton-line skeleton-box" style="width: 90px;"></div>
          </div>
          <div class="skeleton-score skeleton-box"></div>
        </div>
        <div class="skeleton-prob-bar skeleton-box"></div>
      </div>
    `;
  }
  contenedor.innerHTML = html;
}

// ==========================================
// 1. FUNCIÓN PARA CAMBIAR TEMA Y LOGO DE EQUIPO
// ==========================================
function aplicarTemaEquipo(teamKey) {
  const headerLogo = document.getElementById('header-logo');
  const nflDefaultLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';

  if (teamKey === 'DEFAULT' || !teams[teamKey]) {
    // Restaurar colores oficiales predeterminados de la NFL
    document.documentElement.style.setProperty('--primary-theme', '#013369');
    document.documentElement.style.setProperty('--secondary-theme', '#d50a0a');
    
    // Restaurar el logo original de la NFL
    if (headerLogo) {
      headerLogo.src = nflDefaultLogo;
      headerLogo.alt = 'NFL Logo';
    }
    return;
  }

  const equipo = teams[teamKey];

  // Aplicar paleta de colores del equipo seleccionado
  document.documentElement.style.setProperty('--primary-theme', equipo.primaryColor);
  document.documentElement.style.setProperty('--secondary-theme', equipo.secondaryColor);

  // Cambiar el logo del header al logo oficial del equipo desde ESPN
  if (headerLogo) {
    const logoUrl = equipo.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${teamKey.toLowerCase()}.png`;
    headerLogo.src = logoUrl;
    headerLogo.alt = equipo.name || 'Team Logo';
    
    // Si la imagen de algún equipo no carga por cualquier motivo, muestra la de la NFL
    headerLogo.onerror = () => {
      headerLogo.src = nflDefaultLogo;
    };
  }

  // Sincronizar el equipo seleccionado en el calendario si está en esa vista
  const abbrev = Object.keys(teamAbbrevMap).find(a => teamAbbrevMap[a] === teamKey);
  if (abbrev) {
    equipoSeleccionadoCalendario = abbrev;
    const selectSched = document.getElementById('schedule-team-select');
    if (selectSched) {
      selectSched.value = abbrev;
      cargarCalendarioEquipo(abbrev);
    }
  }
}

// ==========================================
// 2. RENDERIZADO Y FILTRADO DE PARTIDOS
// ==========================================
/**
 * Renderiza o actualiza la cuadrícula de partidos.
 * Durante el auto-refresh, actualiza los nodos in-place permitiendo que el odómetro ruede verticalmente.
 */
function renderizarPartidos(esAutoRefresh = false) {
  const contenedorGrid = document.getElementById('games-grid');
  if (!contenedorGrid) return;

  const partidosFiltrados = todosLosPartidos.filter(game => {
    const cumpleEstado = filtroEstadoActual === 'ALL' || game.status === filtroEstadoActual;

    const query = terminoBusqueda.toLowerCase().trim();
    const cumpleBusqueda = !query || 
      game.home.toLowerCase().includes(query) || 
      game.away.toLowerCase().includes(query) ||
      (game.homeAbbrev && game.homeAbbrev.toLowerCase().includes(query)) ||
      (game.awayAbbrev && game.awayAbbrev.toLowerCase().includes(query));

    return cumpleEstado && cumpleBusqueda;
  });

  if (partidosFiltrados.length === 0) {
    contenedorGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <h3>No se encontraron partidos</h3>
        <p>Intenta cambiando el filtro o la semana seleccionada.</p>
      </div>
    `;
    return;
  }

  // AUTO-REFRESH CON TRANSICIONES DE ODÓMETRO IN-PLACE
  // Si las tarjetas ya existen en el DOM, actualizamos sus valores para disparar la animación de ruleta
  if (esAutoRefresh) {
    let todasLasTarjetasCoinciden = true;
    for (const game of partidosFiltrados) {
      if (!contenedorGrid.querySelector(`.game-card[data-game-id="${game.id}"]`)) {
        todasLasTarjetasCoinciden = false;
        break;
      }
    }

    if (todasLasTarjetasCoinciden) {
      partidosFiltrados.forEach((game, idx) => {
        const card = contenedorGrid.querySelector(`.game-card[data-game-id="${game.id}"]`);
        if (!card) return;

        // 1. Actualización de marcadores con efecto ruleta vertical (Odómetro)
        const awayOdometer = card.querySelector('.team-score.away-score .odometer');
        const homeOdometer = card.querySelector('.team-score.home-score .odometer');
        actualizarElementoOdometro(awayOdometer, game.status === 'UPCOMING' ? '-' : game.awayScore);
        actualizarElementoOdometro(homeOdometer, game.status === 'UPCOMING' ? '-' : game.homeScore);

        // 2. Actualización del badge de estado
        const badge = card.querySelector('.status-badge');
        if (badge) {
          badge.textContent = game.statusDetail || game.status;
          let badgeClass = 'status-badge upcoming';
          if (game.status === 'LIVE') badgeClass = 'status-badge live';
          if (game.status === 'FINAL') badgeClass = 'status-badge final';
          badge.className = badgeClass;
        }

        // 3. Actualización de barras de probabilidad
        const homeWinProb = game.winProbability?.home ?? 50;
        const awayWinProb = game.winProbability?.away ?? (100 - homeWinProb);
        const awayBar = card.querySelector('.win-prob-bar.away');
        const homeBar = card.querySelector('.win-prob-bar.home');
        if (awayBar) awayBar.style.width = `${awayWinProb}%`;
        if (homeBar) homeBar.style.width = `${homeWinProb}%`;
        const labels = card.querySelector('.win-prob-labels');
        if (labels) {
          labels.innerHTML = `
            <span>${game.awayAbbrev}: ${awayWinProb}%</span>
            <span>${game.homeAbbrev}: ${homeWinProb}%</span>
          `;
        }

        const homeTeamInfo = buscarInfoEquipo(game.home) || buscarInfoEquipo(game.homeAbbrev) || (teams && teams[game.homeAbbrev]) || {};
        const awayTeamInfo = buscarInfoEquipo(game.away) || buscarInfoEquipo(game.awayAbbrev) || (teams && teams[game.awayAbbrev]) || {};
        const touchdownOverlay = obtenerOverlayTouchdown(game, homeTeamInfo, awayTeamInfo);
        if (touchdownOverlay) {
          const existingOverlay = card.querySelector('.td-overlay');
          if (existingOverlay) existingOverlay.remove();
          card.insertBefore(touchdownOverlay, card.firstChild);
          setTimeout(() => {
            const overlay = card.querySelector('.td-overlay');
            if (overlay) overlay.remove();
          }, 5500);
        }

        // 4. Red Zone
        card.classList.toggle('red-zone-alert', Boolean(game.redZone));

        // 5. Reasignar listener de apertura de modal con el índice actualizado
        card.onclick = () => {
          abrirModal(game, partidosFiltrados, idx);
        };
      });
      return;
    }
  }

  // Renderizado completo inicial o cuando cambia el filtro
  contenedorGrid.innerHTML = '';
  partidosFiltrados.forEach((game, idx) => {
    const tarjeta = crearTarjetaPartido(game, teams, (partido) => {
      abrirModal(partido, partidosFiltrados, idx);
    });
    contenedorGrid.appendChild(tarjeta);
  });
}

// ==========================================
// 3. CARGA DE DATOS DESDE LA API (PARTIDOS EN VIVO)
// ==========================================
async function cargarPartidosPorSemana(semana = null, esAutoRefresh = false) {
  const contenedorGrid = document.getElementById('games-grid');
  
  // Mostrar Skeleton Loaders si es carga inicial o cambio de semana
  if (!esAutoRefresh && contenedorGrid && pestañaProActual === 'partidos') {
    renderizarSkeletons(contenedorGrid, 8);
  }

  const respuesta = await obtenerPartidosNFL(semana);
  semanaActual = respuesta.week;
  todosLosPartidos = respuesta.games;

  // Actualizar la vista activa según la pestaña actual
  if (pestañaProActual === 'partidos') {
    renderizarPartidos(esAutoRefresh);
  } else if (pestañaProActual === 'multipantalla') {
    renderizarMultipantalla();
  } else if (pestañaProActual === 'redzone') {
    renderizarRedZone();
  } else if (pestañaProActual === 'lideres') {
    cargarLideresTemporada(semanaActual, lideresVistaActual);
  }
}

// ==========================================
// AUTO-REFRESH CADA 30 SEGUNDOS (INALTERADO)
// ==========================================
setInterval(() => {
  cargarPartidosPorSemana(semanaActual, true);
}, 30000);

// ==========================================
// 4. CARGA Y RENDERIZADO DE STANDINGS (POSICIONES)
// ==========================================
async function fetchStandingsData() {
  if (standingDataCache) return standingDataCache;
  try {
    // Solicitamos nivel 3 (?level=3) para recibir la estructura completa agrupada por las 8 divisiones
    const res = await fetch('https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3');
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    standingDataCache = data;
    return data;
  } catch (err) {
    console.error('Error cargando standings:', err);
    return null;
  }
}

function generarFilaTabla(entry) {
  const stats = entry?.stats || [];
  const getStat = (name) => {
    const found = stats.find(s => s.name === name || s.type === name);
    return found ? found.displayValue : '0';
  };

  const wins = getStat('wins');
  const losses = getStat('losses');
  const ties = getStat('ties');
  const pct = getStat('winPercent');
  const logo = entry?.team?.logos?.[0]?.href || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';
  const name = entry?.team?.displayName || 'Equipo NFL';

  return `
    <tr>
      <td style="text-align: left; padding: 10px; display: flex; align-items: center; gap: 10px;">
        <img src="${logo}" alt="${name}" width="24" height="24" style="object-fit: contain;" onerror="this.src='https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png'" />
        <span>${name}</span>
      </td>
      <td>${wins}</td>
      <td>${losses}</td>
      <td>${ties}</td>
      <td><strong>${pct}</strong></td>
    </tr>
  `;
}

function renderizarStandingsOriginal(container, data) {
  let html = '<h2 style="margin-bottom: 20px;">Tabla de Posiciones NFL</h2>';
  const children = data?.children || [];

  children.forEach(conf => {
    html += `<h3 style="margin-top: 25px; color: var(--secondary-theme); border-bottom: 2px solid var(--border-color); padding-bottom: 6px;">${conf.name}</h3>`;
    const divisions = conf.children || [conf];

    divisions.forEach(div => {
      const nombreDiv = nombresDivisiones[div.name] || div.name;
      html += `<h4 style="margin: 15px 0 10px 0; color: var(--text-primary); font-size: 1.05rem;">${nombreDiv}</h4>`;
      html += `
        <table class="quarters-table" style="margin-bottom: 20px; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; padding-left: 10px;">Equipo</th>
              <th>G</th>
              <th>P</th>
              <th>E</th>
              <th>PCT</th>
            </tr>
          </thead>
          <tbody>
      `;
      (div.standings?.entries || []).forEach(entry => {
        html += generarFilaTabla(entry);
      });
      html += `</tbody></table>`;
    });
  });

  container.innerHTML = html;
}

// ==========================================
// PRO 4A: CLASIFICACIONES MEJORADAS (CONFERENCIA / DIVISIÓN)
// Y LÍNEA DE CORTE DE PLAYOFFS
// ==========================================
async function cargarClasificaciones(modo = standingsViewMode) {
  const container = document.getElementById('clasificaciones-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
      <h3>Cargando clasificaciones...</h3>
    </div>
  `;

  const data = await fetchStandingsData();
  if (!data) {
    container.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);"><p>No se pudieron cargar las clasificaciones.</p></div>`;
    return;
  }

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
      <h2>Clasificaciones NFL</h2>
      <div class="standings-toggle-container">
        <button id="toggle-division-btn" class="standings-toggle-btn ${modo === 'division' ? 'active' : ''}">Por División</button>
        <button id="toggle-conference-btn" class="standings-toggle-btn ${modo === 'conference' ? 'active' : ''}">Por Conferencia</button>
      </div>
    </div>
  `;

  const conferences = data.children || [];

  if (modo === 'conference') {
    // VISTA POR CONFERENCIA: AFC y NFC con Línea de Corte de Playoffs debajo del 7mo lugar
    conferences.forEach(conf => {
      html += `<h3 style="margin-top: 25px; color: var(--secondary-theme); border-bottom: 2px solid var(--border-color); padding-bottom: 6px;">${conf.name}</h3>`;
      
      // Recolectar todos los equipos de la conferencia
      let allTeams = [];
      if (conf.children && conf.children.length > 0) {
        conf.children.forEach(div => {
          (div.standings?.entries || []).forEach(entry => allTeams.push(entry));
        });
      } else {
        allTeams = conf.standings?.entries || [];
      }

      // Ordenar por porcentaje de victorias (winPercent)
      allTeams.sort((a, b) => {
        const getPct = entry => {
          const s = (entry.stats || []).find(st => st.name === 'winPercent' || st.type === 'winPercent');
          return parseFloat(s?.displayValue || '0');
        };
        return getPct(b) - getPct(a);
      });

      html += `
        <table class="quarters-table" style="margin-bottom: 24px; width: 100%;">
          <thead>
            <tr>
              <th style="text-align: left; padding-left: 10px;"># Equipo</th>
              <th>G</th>
              <th>P</th>
              <th>E</th>
              <th>PCT</th>
            </tr>
          </thead>
          <tbody>
      `;
      allTeams.forEach((entry, idx) => {
        const stats = entry.stats || [];
        const getStat = (name) => {
          const found = stats.find(s => s.name === name || s.type === name);
          return found ? found.displayValue : '0';
        };
        const wins = getStat('wins');
        const losses = getStat('losses');
        const ties = getStat('ties');
        const pct = getStat('winPercent');
        const logo = entry.team?.logos?.[0]?.href || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';
        const name = entry.team?.displayName || 'Equipo NFL';
        const isPlayoffTeam = idx < 7;
        const isCutoffPoint = idx === 6; // 7mo lugar (línea divisoria de playoffs)

        const playoffSeed = isPlayoffTeam 
          ? `<span style="color: #22c55e; font-weight: bold; margin-right: 6px;" title="Puesto de Playoffs">${idx + 1}</span>` 
          : `<span style="color: var(--text-secondary); margin-right: 6px;">${idx + 1}</span>`;

        html += `
          <tr ${isCutoffPoint ? 'class="playoff-cutoff-row"' : ''}>
            <td style="text-align: left; padding: 10px; display: flex; align-items: center; gap: 8px;">
              ${playoffSeed}
              <img src="${logo}" alt="${name}" width="24" height="24" style="object-fit: contain;" onerror="this.src='https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png'" />
              <span>${name}</span>
            </td>
            <td>${wins}</td>
            <td>${losses}</td>
            <td>${ties}</td>
            <td><strong>${pct}</strong></td>
          </tr>
        `;

        // LÍNEA DE CORTE DE PLAYOFFS DISTINTIVA (DEBAJO DEL 7º LUGAR)
        if (isCutoffPoint) {
          html += `
            <tr class="playoff-cutoff-line-row">
              <td colspan="5">
                <div class="cutoff-line-badge">
                  ▲ Línea de Corte de Playoffs (Puestos 1 - 7 Clasifican) ▲
                </div>
              </td>
            </tr>
          `;
        }
      });
      html += `</tbody></table>`;
    });
  } else {
    // VISTA POR DIVISIÓN: 8 tablas independientes (AFC Este, Norte, Sur, Oeste / NFC Este, Norte, Sur, Oeste)
    conferences.forEach(conf => {
      html += `<h3 style="margin-top: 25px; color: var(--secondary-theme); border-bottom: 2px solid var(--border-color); padding-bottom: 6px;">${conf.name}</h3>`;

      if (conf.children && conf.children.length > 0) {
        // La API devolvió las 4 divisiones de la conferencia
        conf.children.forEach(div => {
          const nombreDiv = nombresDivisiones[div.name] || div.name;
          html += `
            <h4 style="margin: 18px 0 10px 0; color: var(--text-primary); font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 4px; height: 16px; background-color: var(--secondary-theme); border-radius: 2px;"></span>
              ${nombreDiv}
            </h4>
            <table class="quarters-table" style="margin-bottom: 24px; width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding-left: 10px;">Equipo</th>
                  <th>G</th>
                  <th>P</th>
                  <th>E</th>
                  <th>PCT</th>
                </tr>
              </thead>
              <tbody>
          `;
          (div.standings?.entries || []).forEach(entry => {
            html += generarFilaTabla(entry);
          });
          html += `</tbody></table>`;
        });
      } else {
        // Respaldo defensivo: agrupar los equipos de la conferencia según el mapeo divisional
        const entries = conf.standings?.entries || [];
        const isAFC = conf.name.includes('American') || conf.abbreviation === 'AFC';
        const divsOrden = isAFC 
          ? ['AFC Este', 'AFC Norte', 'AFC Sur', 'AFC Oeste'] 
          : ['NFC Este', 'NFC Norte', 'NFC Sur', 'NFC Oeste'];

        divsOrden.forEach(nombreDiv => {
          const entriesDiv = entries.filter(e => {
            const teamName = e.team?.name || '';
            return divisionesEquiposFallback[teamName] === nombreDiv;
          });

          html += `
            <h4 style="margin: 18px 0 10px 0; color: var(--text-primary); font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 4px; height: 16px; background-color: var(--secondary-theme); border-radius: 2px;"></span>
              ${nombreDiv}
            </h4>
            <table class="quarters-table" style="margin-bottom: 24px; width: 100%;">
              <thead>
                <tr>
                  <th style="text-align: left; padding-left: 10px;">Equipo</th>
                  <th>G</th>
                  <th>P</th>
                  <th>E</th>
                  <th>PCT</th>
                </tr>
              </thead>
              <tbody>
          `;
          entriesDiv.forEach(entry => {
            html += generarFilaTabla(entry);
          });
          html += `</tbody></table>`;
        });
      }
    });
  }

  container.innerHTML = html;

  // Listeners para los botones de alternar vista
  document.getElementById('toggle-division-btn')?.addEventListener('click', () => {
    standingsViewMode = 'division';
    cargarClasificaciones('division');
  });
  document.getElementById('toggle-conference-btn')?.addEventListener('click', () => {
    standingsViewMode = 'conference';
    cargarClasificaciones('conference');
  });
}

// ==========================================
// PRO 4B: LÍDERES DE LA TEMPORADA / SEMANA ACTUAL
// ==========================================
let lideresVistaActual = 'season';
const lideresSemanaCache = {};

function tituloCategoriaLideres(key) {
  const map = {
    passingYards: 'Passing Yards',
    rushingYards: 'Rushing Yards',
    receivingYards: 'Receiving Yards'
  };
  return map[key] || key;
}

function parsearYardsLeader(displayValue) {
  if (!displayValue) return 0;
  const cleaned = String(displayValue).replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*YDS/i) || cleaned.match(/(\d+(?:\.\d+)?)\s*yards?/i);
  if (!match) return 0;
  return Number(match[1]);
}

async function obtenerLideresSemana(semana) {
  const semanaNum = Number(semana);
  if (!Number.isFinite(semanaNum) || semanaNum < 1) return [];

  const cacheKey = `week-${semanaNum}`;
  if (lideresSemanaCache[cacheKey]) return lideresSemanaCache[cacheKey];

  const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${semanaNum}&seasontype=2`;
  const res = await fetch(scoreboardUrl);
  if (!res.ok) return [];

  const data = await res.json();
  const events = data.events || [];
  if (!events.length) {
    lideresSemanaCache[cacheKey] = [];
    return [];
  }

  const summaries = await Promise.all(events.map(async (event) => {
    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${event.id}`;
    const summaryRes = await fetch(summaryUrl);
    if (!summaryRes.ok) return null;
    return summaryRes.json();
  }));

  const agregados = new Map();
  const categoriasKey = ['passingYards', 'rushingYards', 'receivingYards'];

  summaries.filter(Boolean).forEach((summary) => {
    (summary.leaders || []).forEach((teamLeader) => {
      (teamLeader.leaders || []).forEach((category) => {
        const rawKey = category.name || category.displayName || 'unknown';
        const normalizedKey = categoriasKey.find(cat => rawKey.toLowerCase().includes(cat.toLowerCase())) || rawKey;

        (category.leaders || []).forEach((player) => {
          if (!player.athlete) return;
          const athleteId = player.athlete.id || `${player.athlete.displayName}-${player.athlete.lastName || ''}`;
          const mapKey = `${normalizedKey}-${athleteId}`;
          const existing = agregados.get(mapKey) || {
            name: player.athlete.displayName || player.athlete.fullName || 'Jugador NFL',
            headshot: player.athlete.headshot?.href || 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png',
            pos: player.athlete.position?.abbreviation || 'NFL',
            team: player.team?.abbreviation || teamLeader.team?.abbreviation || '',
            statValue: 0,
            category: normalizedKey
          };

          existing.statValue += parsearYardsLeader(player.displayValue || player.value || '0');
          agregados.set(mapKey, existing);
        });
      });
    });
  });

  const categorias = categoriasKey.map((categoria) => {
    const entries = [...agregados.values()]
      .filter(entry => entry.category === categoria)
      .sort((a, b) => b.statValue - a.statValue)
      .slice(0, 3)
      .map((entry, idx) => ({
        rank: idx + 1,
        name: entry.name,
        headshot: entry.headshot,
        pos: entry.pos,
        team: entry.team,
        statValue: `${Math.round(entry.statValue).toLocaleString('es-MX')} YDS`
      }));

    return {
      titulo: `${tituloCategoriaLideres(categoria)} Leaders`,
      leaders: entries
    };
  });

  lideresSemanaCache[cacheKey] = categorias;
  return categorias;
}

async function cargarLideresTemporada(semana = semanaActual, vista = lideresVistaActual) {
  const container = document.getElementById('lideres-container');
  if (!container) return;

  const semanaSeleccionada = Number.isFinite(Number(semana)) ? Number(semana) : (semanaActual ?? 1);
  const esVistaSemana = vista === 'week';
  const currentWeekNumber = Number.isFinite(Number(semanaActual)) ? Number(semanaActual) : 1;
  const esSemanaFutura = semanaSeleccionada > currentWeekNumber;

  if (esVistaSemana && esSemanaFutura) {
    renderizarCardsLideres(container, [], {
      titulo: `Líderes de la semana ${semanaSeleccionada}`,
      subtitulo: 'Todavía no juegan en esta semana. Vuelve cuando haya partidos por disputarse o finalizados.',
      scope: 'week',
      semana: semanaSeleccionada
    });
    return;
  }

  if (esVistaSemana && !esSemanaFutura) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-secondary);">
        <div style="font-size: 2rem; margin-bottom: 12px;">📊</div>
        <h3>Cargando líderes de la semana ${semanaSeleccionada}...</h3>
        <p style="font-size: 0.85rem; margin-top: 6px;">Consultando las estadísticas de la semana seleccionada.</p>
      </div>
    `;

    try {
      const datosSemana = await obtenerLideresSemana(semanaSeleccionada);
      if (datosSemana.length === 0 || datosSemana.every(cat => !cat.leaders.length)) {
        renderizarCardsLideres(container, [], {
          titulo: `Líderes de la semana ${semanaSeleccionada}`,
          subtitulo: 'Todavía no hay líderes publicados para esta semana.',
          scope: 'week',
          semana: semanaSeleccionada
        });
        return;
      }

      renderizarCardsLideres(container, datosSemana, {
        titulo: `Líderes de la semana ${semanaSeleccionada}`,
        subtitulo: 'Pase, carrera y recepción durante la semana activa.',
        scope: 'week',
        semana: semanaSeleccionada
      });
      return;
    } catch (err) {
      console.warn('No se pudieron cargar los líderes de la semana:', err);
      renderizarCardsLideres(container, [], {
        titulo: `Líderes de la semana ${semanaSeleccionada}`,
        subtitulo: 'No hay líderes disponibles todavía para esta semana.',
        scope: 'week',
        semana: semanaSeleccionada
      });
      return;
    }
  }

  if (lideresTemporadaCache) {
    container.innerHTML = lideresTemporadaCache;
    const toggleButtons = container.querySelectorAll('.leader-scope-btn');
    toggleButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.scope === vista);
    });
    return;
  }

  container.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-secondary);">
      <div style="font-size: 2rem; margin-bottom: 12px;">⭐</div>
      <h3>Cargando líderes oficiales de la temporada NFL...</h3>
      <p style="font-size: 0.85rem; margin-top: 6px;">Consultando estadísticas oficiales de ESPN...</p>
    </div>
  `;

  const lideresRespaldo = [
    {
      titulo: 'Passing Yards Leaders',
      leaders: [
        { rank: 1, name: 'Joe Burrow', team: 'CIN', pos: 'QB', statValue: '4,918 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/3915511.png' },
        { rank: 2, name: 'Jared Goff', team: 'DET', pos: 'QB', statValue: '4,629 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/3046779.png' },
        { rank: 3, name: 'Baker Mayfield', team: 'TB', pos: 'QB', statValue: '4,500 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/3052587.png' }
      ]
    },
    {
      titulo: 'Rushing Yards Leaders',
      leaders: [
        { rank: 1, name: 'Saquon Barkley', team: 'PHI', pos: 'RB', statValue: '2,005 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/3929630.png' },
        { rank: 2, name: 'Derrick Henry', team: 'BAL', pos: 'RB', statValue: '1,921 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/3043078.png' },
        { rank: 3, name: 'Bijan Robinson', team: 'ATL', pos: 'RB', statValue: '1,456 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/4430807.png' }
      ]
    },
    {
      titulo: 'Receiving Yards Leaders',
      leaders: [
        { rank: 1, name: "Ja'Marr Chase", team: 'CIN', pos: 'WR', statValue: '1,708 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/4362628.png' },
        { rank: 2, name: 'Justin Jefferson', team: 'MIN', pos: 'WR', statValue: '1,533 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/4262921.png' },
        { rank: 3, name: 'Brian Thomas Jr.', team: 'JAX', pos: 'WR', statValue: '1,282 YDS', headshot: 'https://a.espncdn.com/i/headshots/nfl/players/full/4432773.png' }
      ]
    }
  ];

  try {
    const seasonLeadersUrl = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${CURRENT_NFL_SEASON}/types/2/leaders`;
    const res = await fetch(seasonLeadersUrl);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();

    const targets = [
      { key: 'passingYards', label: 'Passing Yards Leaders' },
      { key: 'rushingYards', label: 'Rushing Yards Leaders' },
      { key: 'receivingYards', label: 'Receiving Yards Leaders' }
    ];

    const categoriasProcesadas = await Promise.all(targets.map(async target => {
      const cat = (data.categories || []).find(c => c.name === target.key);
      if (!cat) return null;
      const top3 = (cat.leaders || []).slice(0, 3);

      const leadersData = await Promise.all(top3.map(async (l, idx) => {
        const athRef = l.athlete?.$ref || l.athlete?.['$ref'];
        const teamRef = l.team?.$ref || l.team?.['$ref'];

        const athUrl = athRef ? athRef.replace('http:', 'https:') : null;
        const teamUrl = teamRef ? teamRef.replace('http:', 'https:') : null;

        const [ath, team] = await Promise.all([
          athUrl ? fetch(athUrl).then(r => r.json()).catch(() => null) : null,
          teamUrl ? fetch(teamUrl).then(r => r.json()).catch(() => null) : null
        ]);

        const numVal = parseInt(l.displayValue || l.value || '0', 10);
        const displayFormatted = isNaN(numVal) ? (l.displayValue || '0') : numVal.toLocaleString('es-MX') + ' YDS';

        return {
          rank: idx + 1,
          name: ath?.displayName || ath?.fullName || 'Jugador NFL',
          headshot: ath?.headshot?.href || 'https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png',
          pos: ath?.position?.abbreviation || 'NFL',
          team: team?.abbreviation || team?.name || '',
          statValue: displayFormatted
        };
      }));

      return {
        titulo: target.label,
        leaders: leadersData
      };
    }));

    const datosFinales = categoriasProcesadas.filter(Boolean).length === 3
      ? categoriasProcesadas.filter(Boolean)
      : lideresRespaldo;

    renderizarCardsLideres(container, datosFinales, {
      titulo: 'Líderes de la Temporada NFL',
      subtitulo: 'Top 3 de jugadores con mayor yardaje en la temporada regular (Pase, Carrera y Recepción).',
      scope: 'season',
      semana: semanaSeleccionada
    });
  } catch (err) {
    console.warn('Usando datos de temporada verificados de respaldo para líderes:', err);
    renderizarCardsLideres(container, lideresRespaldo, {
      titulo: 'Líderes de la Temporada NFL',
      subtitulo: 'Top 3 de jugadores con mayor yardaje en la temporada regular (Pase, Carrera y Recepción).',
      scope: 'season',
      semana: semanaSeleccionada
    });
  }
}

function renderizarCardsLideres(container, categorias, opts = {}) {
  const { titulo = 'Líderes de la Temporada NFL', subtitulo = 'Top 3 de jugadores con mayor yardaje en la temporada regular (Pase, Carrera y Recepción).', scope = 'season', semana = semanaActual } = opts;

  let html = `
    <div style="grid-column: 1 / -1; margin-bottom: 12px;">
      <div class="standings-toggle-container" style="margin-bottom: 10px;">
        <button class="standings-toggle-btn leader-scope-btn ${scope === 'season' ? 'active' : ''}" data-scope="season">Generales</button>
        <button class="standings-toggle-btn leader-scope-btn ${scope === 'week' ? 'active' : ''}" data-scope="week">Semana ${semana ?? 1}</button>
      </div>
      <h2>${titulo}</h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
        ${subtitulo}
      </p>
    </div>
  `;

  if (!categorias.length) {
    html += `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
        <div style="font-size: 2.2rem; margin-bottom: 10px;">🏈</div>
        <h3 style="margin-bottom: 8px;">${titulo}</h3>
        <p>${subtitulo}</p>
      </div>
    `;
    container.innerHTML = html;

    container.querySelectorAll('.leader-scope-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        lideresVistaActual = btn.dataset.scope;
        cargarLideresTemporada(semanaActual, lideresVistaActual);
      });
    });
    return;
  }

  categorias.forEach(cat => {
    html += `
      <div class="leader-card">
        <h3>${cat.titulo}</h3>
    `;

    if (!cat.leaders || cat.leaders.length === 0) {
      html += `
        <div style="padding: 20px 0 8px; color: var(--text-secondary); font-size: 0.8rem; text-align: center;">
          No hay líderes reportados para esta categoría.
        </div>
      `;
      html += `</div>`;
      return;
    }

    cat.leaders.forEach(leader => {
      const teamLine = leader.team ? `${leader.team} • ${leader.pos}` : leader.pos;
      const rankBadgeColor = leader.rank === 1 ? '#eab308' : (leader.rank === 2 ? '#94a3b8' : '#cd7f32');

      html += `
        <div class="leader-entry">
          <span class="leader-rank" style="color: ${rankBadgeColor};">${leader.rank}</span>
          <img src="${leader.headshot}" alt="${leader.name}" class="leader-headshot" onerror="this.src='https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/default.png'" />
          <div class="leader-info">
            <div class="leader-name">${leader.name}</div>
            <div class="leader-team">${teamLine}</div>
          </div>
          <div class="leader-stat" style="color: var(--text-primary); font-size: 1.05rem;">${leader.statValue}</div>
        </div>
      `;
    });

    html += `</div>`;
  });

  container.innerHTML = html;
  if (scope === 'season') {
    lideresTemporadaCache = html;
  }

  container.querySelectorAll('.leader-scope-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      lideresVistaActual = btn.dataset.scope;
      cargarLideresTemporada(semanaActual, lideresVistaActual);
    });
  });
}

// ==========================================
// NUEVA HERRAMIENTA: CALENDARIO POR EQUIPO (TEAM SCHEDULE)
// ==========================================
function renderizarVistaCalendario() {
  const container = document.getElementById('calendario-container');
  if (!container) return;

  // Obtener lista ordenada alfabéticamente de los 32 equipos
  const listaEquipos = Object.keys(teams).map(key => {
    const t = teams[key];
    const abbrev = teamAbbrevMap ? Object.keys(teamAbbrevMap).find(a => teamAbbrevMap[a] === key) : key;
    return {
      key: key,
      name: t.name,
      abbrev: abbrev || key,
      logo: t.logo
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Generar HTML base con selector nativo y contenedor de tabla
  container.innerHTML = `
    <div class="schedule-header-card">
      <div class="schedule-team-preview" id="schedule-team-preview">
        <!-- Info del equipo activo -->
      </div>
      <div class="schedule-select-wrapper">
        <label for="schedule-team-select">Seleccionar Franquicia:</label>
        <div class="select-shell schedule-select-shell">
          <select id="schedule-team-select" class="schedule-select">
            ${listaEquipos.map(eq => `
              <option value="${eq.abbrev}" ${eq.abbrev === equipoSeleccionadoCalendario ? 'selected' : ''}>
                ${eq.name} (${eq.abbrev})
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="schedule-table-card" id="schedule-table-card">
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <h3>Cargando calendario...</h3>
      </div>
    </div>
  `;

  // Listener para el selector de franquicia
  const selectEl = document.getElementById('schedule-team-select');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      equipoSeleccionadoCalendario = e.target.value;
      cargarCalendarioEquipo(equipoSeleccionadoCalendario);
    });
  }

  // Cargar calendario del equipo seleccionado
  cargarCalendarioEquipo(equipoSeleccionadoCalendario);
}

async function cargarCalendarioEquipo(abbrev) {
  const tableCard = document.getElementById('schedule-table-card');
  const previewContainer = document.getElementById('schedule-team-preview');
  if (!tableCard) return;

  // Actualizar banner del equipo
  const teamInfo = buscarInfoEquipo(abbrev);
  const teamName = teamInfo?.name || abbrev;
  const teamLogo = teamInfo?.logo || `https://a.espncdn.com/i/teamlogos/nfl/500/${abbrev.toLowerCase()}.png`;

  if (previewContainer) {
    previewContainer.innerHTML = `
      <img src="${teamLogo}" alt="${teamName}" class="schedule-team-logo" onerror="this.src='https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png'" />
      <div class="schedule-team-info">
        <h2>${teamName}</h2>
        <div class="schedule-team-meta" id="schedule-team-record">Calendario Oficial de Temporada Regular</div>
      </div>
    `;
  }

  tableCard.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
      <h3>Cargando calendario de ${teamName}...</h3>
    </div>
  `;

  try {
    let data = cacheCalendarios[abbrev.toLowerCase()];
    if (!data) {
      const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/${abbrev.toLowerCase()}/schedule?season=${CURRENT_NFL_SEASON}`;
      const res = await fetch(scheduleUrl);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      data = await res.json();
      cacheCalendarios[abbrev.toLowerCase()] = data;
    }

    const events = data.events || [];
    if (events.length === 0) {
      tableCard.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>No se encontraron partidos para este equipo.</p>
        </div>
      `;
      return;
    }

    // Calcular récord de victorias y derrotas
    let wins = 0;
    let losses = 0;
    let ties = 0;

    let rowsHtml = '';
    const defaultLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';

    events.forEach(ev => {
      const comp = ev.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const myComp = competitors.find(c => c.team?.abbreviation?.toLowerCase() === abbrev.toLowerCase()) || competitors[0] || {};
      const oppComp = competitors.find(c => c.team?.id !== myComp?.team?.id) || competitors[1] || {};

      const isHome = myComp?.homeAway === 'home';
      const condicionBadge = isHome 
        ? '<span class="schedule-badge home">LOCAL</span>' 
        : '<span class="schedule-badge away">VISITANTE</span>';
      const vsPrefix = isHome ? 'vs' : '@';

      const oppName = oppComp.team?.displayName || oppComp.team?.name || 'Rival';
      const oppLogo = oppComp.team?.logos?.[0]?.href || oppComp.team?.logo || defaultLogo;

      // Semana
      const weekLabel = ev.week?.text || `Semana ${ev.week?.number || '-'}`;

      // Fecha
      let fechaTexto = 'Programado';
      if (ev.date) {
        const d = new Date(ev.date);
        const formatter = new Intl.DateTimeFormat('es-MX', {
          timeZone: 'America/Mexico_City',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        fechaTexto = formatter.format(d);
      }

      // Resultado o estado
      let resultadoHtml = '<span class="schedule-result upcoming">Programado</span>';
      const isCompleted = comp.status?.type?.completed;

      if (isCompleted) {
        const myScore = parseInt(myComp.score?.displayValue || myComp.score?.value || '0', 10);
        const oppScore = parseInt(oppComp.score?.displayValue || oppComp.score?.value || '0', 10);

        if (myScore > oppScore) {
          wins++;
          resultadoHtml = `<span class="schedule-result win">G ${myScore} - ${oppScore}</span>`;
        } else if (myScore < oppScore) {
          losses++;
          resultadoHtml = `<span class="schedule-result loss">P ${myScore} - ${oppScore}</span>`;
        } else {
          ties++;
          resultadoHtml = `<span class="schedule-result tie">E ${myScore} - ${oppScore}</span>`;
        }
      }

      rowsHtml += `
        <tr>
          <td style="font-weight: 700;">${weekLabel}</td>
          <td>${condicionBadge}</td>
          <td>
            <div class="schedule-opponent">
              <span style="color: var(--text-secondary); font-size: 0.8rem;">${vsPrefix}</span>
              <img src="${oppLogo}" alt="${oppName}" onerror="this.src='${defaultLogo}'" />
              <span>${oppName}</span>
            </div>
          </td>
          <td style="color: var(--text-secondary);">${fechaTexto}</td>
          <td>${resultadoHtml}</td>
        </tr>
      `;
    });

    // Actualizar récord en el banner
    const recordEl = document.getElementById('schedule-team-record');
    if (recordEl) {
      const byeText = data.byeWeek ? ` • Semana de Descanso: ${data.byeWeek}` : '';
      recordEl.textContent = `Récord Temporada: ${wins}-${losses}${ties > 0 ? '-' + ties : ''} (${events.length} Partidos)${byeText}`;
    }

    tableCard.innerHTML = `
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Semana</th>
            <th>Condición</th>
            <th>Rival</th>
            <th>Fecha / Hora (CDMX)</th>
            <th>Resultado / Estado</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

  } catch (err) {
    console.error('Error cargando calendario:', err);
    tableCard.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>No se pudo cargar el calendario de este equipo.</p>
        <p style="font-size: 0.85rem; margin-top: 6px;">Por favor, intenta seleccionando otro equipo o recarga la página.</p>
      </div>
    `;
  }
}

// ==========================================
// PRO 4C: MULTIPANTALLA CON CASILLAS Y FILTRO
// ==========================================
function renderizarMultipantalla() {
  const controls = document.getElementById('multipantalla-controls');
  const grid = document.getElementById('multipantalla-grid');
  if (!controls || !grid) return;

  // Generar controles de casillas de selección
  let controlsHtml = `
    <div style="display: flex; gap: 8px; align-items: center; width: 100%; margin-bottom: 8px; flex-wrap: wrap;">
      <span style="font-weight: 700; font-size: 0.9rem;">Seleccionar Partidos:</span>
      <button id="select-all-multi-btn" class="multiscreen-filter-btn">Seleccionar Todos</button>
      <button id="clear-all-multi-btn" class="multiscreen-filter-btn">Deseleccionar</button>
      <button id="crunch-filter-multi-btn" class="multiscreen-filter-btn ${filtroMultipantallaCrunch ? 'active' : ''}">
        ⏱️ Crunch Time / Red Zone
      </button>
    </div>
    <div style="display: flex; gap: 12px; flex-wrap: wrap; width: 100%;">
  `;

  // Si no hay partidos seleccionados por defecto, seleccionar los primeros 4 o los en vivo
  if (partidosSeleccionadosMultipantalla.size === 0 && todosLosPartidos.length > 0) {
    const liveGames = todosLosPartidos.filter(g => g.status === 'LIVE');
    const defaults = liveGames.length > 0 ? liveGames : todosLosPartidos.slice(0, 4);
    defaults.forEach(g => partidosSeleccionadosMultipantalla.add(g.id));
  }

  todosLosPartidos.forEach(game => {
    const isChecked = partidosSeleccionadosMultipantalla.has(game.id);
    const isLive = game.status === 'LIVE';
    controlsHtml += `
      <label class="multiscreen-checkbox">
        <input type="checkbox" data-game-id="${game.id}" ${isChecked ? 'checked' : ''} />
        <span>${game.awayAbbrev} @ ${game.homeAbbrev} ${isLive ? '🔴' : ''}</span>
      </label>
    `;
  });

  controlsHtml += '</div>';
  controls.innerHTML = controlsHtml;

  // Filtrar los partidos a mostrar
  let partidosAMostrar = todosLosPartidos.filter(g => partidosSeleccionadosMultipantalla.has(g.id));

  if (filtroMultipantallaCrunch) {
    partidosAMostrar = partidosAMostrar.filter(g => {
      // Crunch time: LIVE y diferencia <= 8 puntos o en Red Zone
      const scoreDiff = Math.abs(g.homeScore - g.awayScore);
      return g.status === 'LIVE' && (g.redZone || scoreDiff <= 8);
    });
  }

  grid.innerHTML = '';

  if (partidosAMostrar.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <h3>No hay partidos para mostrar en la multipantalla</h3>
        <p>Marca las casillas superiores para elegir qué partidos seguir simultáneamente.</p>
      </div>
    `;
    return;
  }

  partidosAMostrar.forEach((game, idx) => {
    const card = crearTarjetaPartido(game, teams, (partido) => {
      abrirModal(partido, partidosAMostrar, idx);
    });
    grid.appendChild(card);
  });

  // Event Listeners para casillas
  controls.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const gId = e.target.dataset.gameId;
      if (e.target.checked) {
        partidosSeleccionadosMultipantalla.add(gId);
      } else {
        partidosSeleccionadosMultipantalla.delete(gId);
      }
      renderizarMultipantalla();
    });
  });

  document.getElementById('select-all-multi-btn')?.addEventListener('click', () => {
    todosLosPartidos.forEach(g => partidosSeleccionadosMultipantalla.add(g.id));
    renderizarMultipantalla();
  });

  document.getElementById('clear-all-multi-btn')?.addEventListener('click', () => {
    partidosSeleccionadosMultipantalla.clear();
    renderizarMultipantalla();
  });

  document.getElementById('crunch-filter-multi-btn')?.addEventListener('click', () => {
    filtroMultipantallaCrunch = !filtroMultipantallaCrunch;
    renderizarMultipantalla();
  });
}

// ==========================================
// PRO 4D: MODO REDZONE (SOLO REDZONE & CRUNCH TIME)
// ==========================================
function renderizarRedZone() {
  const grid = document.getElementById('redzone-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Red Zone: partidos en vivo donde están en zona roja o diferencia <= 8 en el 4to cuarto
  const partidosRedZone = todosLosPartidos.filter(g => {
    if (g.status !== 'LIVE') return false;
    if (g.redZone) return true;
    
    // Si no está marcada como redzone por API, checar down & distance o situación
    const downText = (g.downDistanceText || '').toLowerCase();
    const lastPlay = (g.lastPlay || '').toLowerCase();
    const enYarda20 = downText.includes('at opp') || downText.includes('red zone') || lastPlay.includes('red zone');
    
    const diff = Math.abs(g.homeScore - g.awayScore);
    const esCrunchTime = diff <= 8; // Una posesión de diferencia

    return enYarda20 || esCrunchTime;
  });

  if (partidosRedZone.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
        <div style="font-size: 3rem; margin-bottom: 12px;">🏈</div>
        <h2 style="color: #ef4444; margin-bottom: 8px;">MODO REDZONE ACTIVO</h2>
        <p style="font-size: 1rem;">No hay partidos en la yarda 20 o en Crunch Time en este momento exacto.</p>
        <p style="font-size: 0.85rem; margin-top: 6px; color: var(--text-secondary);">
          Esta pantalla se actualiza en tiempo real cada 30 segundos conforme los equipos avanzan a zona de anotación.
        </p>
      </div>
    `;
    return;
  }

  partidosRedZone.forEach((game, idx) => {
    const card = crearTarjetaPartido(game, teams, (partido) => {
      abrirModal(partido, partidosRedZone, idx);
    });
    grid.appendChild(card);
  });
}

// ==========================================
// 5. CONTROLADOR DE PESTAÑAS PRO Y NAVEGACIÓN
// ==========================================
function cambiarPestañaPro(nombrePestaña) {
  pestañaProActual = nombrePestaña;

  // Actualizar botones de pestaña
  document.querySelectorAll('.pro-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === nombrePestaña);
  });

  // Ocultar todas las secciones de vista
  document.querySelectorAll('.view-section').forEach(view => {
    view.classList.remove('active');
  });

  // Mostrar u ocultar barra de búsqueda/filtros según corresponda
  const subHeader = document.getElementById('sub-header');
  if (subHeader) {
    subHeader.style.display = (nombrePestaña === 'partidos') ? 'block' : 'none';
  }

  // Activar la vista correspondiente
  switch (nombrePestaña) {
    case 'partidos':
      document.getElementById('games-view')?.classList.add('active');
      renderizarPartidos();
      break;
    case 'clasificaciones':
      document.getElementById('clasificaciones-view')?.classList.add('active');
      cargarClasificaciones(standingsViewMode);
      break;
    case 'lideres':
      document.getElementById('lideres-view')?.classList.add('active');
      cargarLideresTemporada();
      break;
    case 'calendario':
      document.getElementById('calendario-view')?.classList.add('active');
      renderizarVistaCalendario();
      break;
    case 'multipantalla':
      document.getElementById('multipantalla-view')?.classList.add('active');
      renderizarMultipantalla();
      break;
    case 'redzone':
      document.getElementById('redzone-view')?.classList.add('active');
      renderizarRedZone();
      break;
  }
}

// ==========================================
// 6. CONFIGURACIÓN DE EVENTOS DE LA UI
// ==========================================
function inicializarEventosUI() {
  // Filtros de estado de partido (Todos, En vivo, Finalizados, Próximos)
  const botonesFiltro = document.querySelectorAll('.filter-btn');
  botonesFiltro.forEach(btn => {
    btn.addEventListener('click', (e) => {
      botonesFiltro.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      filtroEstadoActual = e.target.dataset.filter;
      renderizarPartidos();
    });
  });

  // Buscador de equipos
  const inputBusqueda = document.getElementById('team-search-input');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
      terminoBusqueda = e.target.value;
      renderizarPartidos();
    });
  }

  // Pestañas originales del navbar (Partidos / Standings)
  const btnGames = document.getElementById('view-games-btn');
  const btnStandings = document.getElementById('view-standings-btn');
  const viewGames = document.getElementById('games-view');
  const viewStandings = document.getElementById('standings-view');

  if (btnGames && btnStandings) {
    btnGames.addEventListener('click', () => {
      btnGames.classList.add('active');
      btnStandings.classList.remove('active');
      cambiarPestañaPro('partidos');
    });

    btnStandings.addEventListener('click', () => {
      btnStandings.classList.add('active');
      btnGames.classList.remove('active');
      document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
      viewStandings?.classList.add('active');
      
      // Ocultar sub-header en vista de standings
      const subHeader = document.getElementById('sub-header');
      if (subHeader) subHeader.style.display = 'none';

      const containerStandings = document.getElementById('standings-container');
      if (containerStandings) {
        fetchStandingsData().then(data => {
          if (data) renderizarStandingsOriginal(containerStandings, data);
        });
      }
    });
  }

  // PRO 4: Pestañas de navegación Pro
  document.querySelectorAll('.pro-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.dataset.tab;
      cambiarPestañaPro(targetTab);

      // Sincronizar pestañas superiores si se regresa a partidos
      if (targetTab === 'partidos' && btnGames && btnStandings) {
        btnGames.classList.add('active');
        btnStandings.classList.remove('active');
      } else if (btnGames && btnStandings) {
        btnGames.classList.remove('active');
        btnStandings.classList.remove('active');
      }
    });
  });

  // PRO 4: Toggle Modo Oscuro/Claro
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    const updateIcon = () => {
      const mode = getCurrentTheme();
      themeToggleBtn.textContent = mode === 'dark' ? '☀️' : '🌙';
      themeToggleBtn.setAttribute('title', mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    };

    updateIcon();

    themeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      updateIcon();
    });
  }
}

// ==========================================
// 7. INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
async function initApp() {
  // Inicializar tema guardado
  initThemeToggle();

  inicializarNavbar(
    teams,
    (equipoSeleccionado) => aplicarTemaEquipo(equipoSeleccionado),
    (nuevaSemana) => cargarPartidosPorSemana(nuevaSemana)
  );

  inicializarEventosUI();
  await cargarPartidosPorSemana();
}

document.addEventListener('DOMContentLoaded', initApp);
