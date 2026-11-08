/**
 * Inicializa y controla los eventos de la barra de navegación y selectores.
 * @param {Object} teamsData - Diccionario con todos los equipos para poblar el selector dinámico
 * @param {Function} onTeamSelect - Callback ejecutado cuando el usuario cambia su equipo favorito
 * @param {Function} onWeekChange - Callback ejecutado cuando el usuario cambia la semana
 */
export function inicializarNavbar(teamsData, onTeamSelect, onWeekChange) {
  const selectFavTeam = document.getElementById('fav-team-select');
  const prevWeekBtn = document.getElementById('prev-week-btn');
  const nextWeekBtn = document.getElementById('next-week-btn');
  const currentWeekLabel = document.getElementById('current-week-label');

  let currentWeek = 9; // Semana inicial por defecto

  // 1. Poblar dinámicamente los 32 equipos en el selector
  if (selectFavTeam && teamsData) {
    Object.keys(teamsData).forEach(teamKey => {
      const team = teamsData[teamKey];
      const option = document.createElement('option');
      option.value = teamKey;
      option.textContent = team.name;
      selectFavTeam.appendChild(option);
    });

    // Escuchar cambios de tema según el equipo favorito
    selectFavTeam.addEventListener('change', (e) => {
      const selectedTeamKey = e.target.value;
      if (typeof onTeamSelect === 'function') {
        onTeamSelect(selectedTeamKey);
      }
    });
  }

  // 2. Controladores de cambio de semana
  function actualizarEtiquetaSemana() {
    if (currentWeekLabel) {
      currentWeekLabel.textContent = `Semana ${currentWeek}`;
    }
    if (typeof onWeekChange === 'function') {
      onWeekChange(currentWeek);
    }
  }

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      if (currentWeek > 1) {
        currentWeek--;
        actualizarEtiquetaSemana();
      }
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      if (currentWeek < 18) {
        currentWeek++;
        actualizarEtiquetaSemana();
      }
    });
  }

  // Setear texto inicial
  actualizarEtiquetaSemana();
}