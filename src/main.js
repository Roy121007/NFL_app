import { teams } from './data/teams.js';
import { obtenerPartidosNFL } from './data/api.js';
import { crearTarjetaPartido } from './components/gameCard.js';
import { inicializarModal } from './components/gameModal.js';
import { inicializarNavbar } from './components/navbar.js';

// ==========================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ==========================================
let todosLosPartidos = [];
let filtroEstadoActual = 'ALL';
let terminoBusqueda = '';
let semanaActual = null;

// Inicializar controlador del Modal
const { abrirModal } = inicializarModal();

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
}

// ==========================================
// 2. RENDERIZADO Y FILTRADO DE PARTIDOS
// ==========================================
function renderizarPartidos() {
  const contenedorGrid = document.getElementById('games-grid');
  if (!contenedorGrid) return;

  contenedorGrid.innerHTML = '';

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

  partidosFiltrados.forEach(game => {
    const tarjeta = crearTarjetaPartido(game, teams, (partido, local, visitante) => {
      abrirModal(partido, local, visitante);
    });
    contenedorGrid.appendChild(tarjeta);
  });
}

// ==========================================
// 3. CARGA DE DATOS DESDE LA API (PARTIDOS EN VIVO)
// ==========================================
async function cargarPartidosPorSemana(semana = null) {
  const contenedorGrid = document.getElementById('games-grid');
  if (contenedorGrid) {
    contenedorGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
        <h3>Cargando partidos en vivo...</h3>
      </div>
    `;
  }

  const respuesta = await obtenerPartidosNFL(semana);
  semanaActual = respuesta.week;
  todosLosPartidos = respuesta.games;

  renderizarPartidos();
}

// ==========================================
// 4. CARGA Y RENDERIZADO DE STANDINGS (POSICIONES)
// ==========================================
async function cargarStandings() {
  const containerStandings = document.getElementById('standings-container');
  if (!containerStandings) return;

  containerStandings.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
      <h3>Cargando posiciones oficiales...</h3>
    </div>
  `;

  try {
    const res = await fetch('https://site.api.espn.com/apis/v2/sports/football/nfl/standings');
    const data = await res.json();
    
    let html = '<h2 style="margin-bottom: 20px;">Tabla de Posiciones NFL</h2>';

    const children = data.children || [];

    children.forEach(conf => {
      html += `<h3 style="margin-top: 25px; color: var(--secondary-theme); border-bottom: 2px solid var(--border-color); padding-bottom: 6px;">${conf.name}</h3>`;
      
      const divisions = conf.children || [conf];

      divisions.forEach(div => {
        html += `<h4 style="margin: 15px 0 10px 0; color: var(--text-primary);">${div.name}</h4>`;
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

        const standingsList = div.standings?.entries || [];

        standingsList.forEach(entry => {
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

          html += `
            <tr>
              <td style="text-align: left; padding: 10px; display: flex; align-items: center; gap: 10px;">
                <img src="${logo}" alt="${name}" width="24" height="24" style="object-fit: contain;" />
                <span>${name}</span>
              </td>
              <td>${wins}</td>
              <td>${losses}</td>
              <td>${ties}</td>
              <td><strong>${pct}</strong></td>
            </tr>
          `;
        });

        html += `</tbody></table>`;
      });
    });

    containerStandings.innerHTML = html;
  } catch (err) {
    console.error('Error cargando standings:', err);
    containerStandings.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
        <p>No se pudieron cargar las posiciones en este momento.</p>
      </div>
    `;
  }
}

// ==========================================
// 5. CONFIGURACIÓN DE EVENTOS DE LA UI
// ==========================================
function inicializarEventosUI() {
  const botonesFiltro = document.querySelectorAll('.filter-btn');
  botonesFiltro.forEach(btn => {
    btn.addEventListener('click', (e) => {
      botonesFiltro.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      filtroEstadoActual = e.target.dataset.filter;
      renderizarPartidos();
    });
  });

  const inputBusqueda = document.getElementById('team-search-input');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', (e) => {
      terminoBusqueda = e.target.value;
      renderizarPartidos();
    });
  }

  const btnGames = document.getElementById('view-games-btn');
  const btnStandings = document.getElementById('view-standings-btn');
  const viewGames = document.getElementById('games-view');
  const viewStandings = document.getElementById('standings-view');

  if (btnGames && btnStandings) {
    btnGames.addEventListener('click', () => {
      btnGames.classList.add('active');
      btnStandings.classList.remove('active');
      viewGames.classList.add('active');
      viewStandings.classList.remove('active');
    });

    btnStandings.addEventListener('click', () => {
      btnStandings.classList.add('active');
      btnGames.classList.remove('active');
      viewStandings.classList.add('active');
      viewGames.classList.remove('active');
      
      cargarStandings();
    });
  }
}

// ==========================================
// 6. INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================
async function initApp() {
  inicializarNavbar(
    teams,
    (equipoSeleccionado) => aplicarTemaEquipo(equipoSeleccionado),
    (nuevaSemana) => cargarPartidosPorSemana(nuevaSemana)
  );

  inicializarEventosUI();
  await cargarPartidosPorSemana();
}

document.addEventListener('DOMContentLoaded', initApp);