/**
 * Componente para crear y devolver la tarjeta HTML de un partido.
 */
export function crearTarjetaPartido(game, teams, onCardClick) {
  const card = document.createElement('div');
  card.className = `game-card ${game.redZone ? 'red-zone-alert' : ''}`;

  // Obtener colores por defecto si no existen en el diccionario de teams
  const homeTeamInfo = teams[game.homeAbbrev] || {};
  const awayTeamInfo = teams[game.awayAbbrev] || {};

  // Extraer probabilidades con valores seguros por defecto
  const homeWinProb = game.winProbability?.home ?? 50;
  const awayWinProb = game.winProbability?.away ?? (100 - homeWinProb);

  // Formato del badge de estado
  let statusBadgeClass = 'upcoming';
  if (game.status === 'LIVE') statusBadgeClass = 'live';
  if (game.status === 'FINAL') statusBadgeClass = 'final';

  card.innerHTML = `
    <div class="card-header">
      <span class="status-badge ${statusBadgeClass}">${game.statusDetail}</span>
      ${game.redZone ? '<span style="color: var(--accent-redzone); font-weight: bold;">🔴 RED ZONE</span>' : ''}
    </div>

    <!-- Equipo Visitante -->
    <div class="team-row">
      <div class="team-info">
        <img src="${game.awayLogo}" alt="${game.away}" class="team-logo" />
        <span class="team-name">${game.awayAbbrev || game.away}</span>
      </div>
      <span class="team-score">${game.status === 'UPCOMING' ? '-' : game.awayScore}</span>
    </div>

    <div class="vs-divider">VS</div>

    <!-- Equipo Local -->
    <div class="team-row">
      <div class="team-info">
        <img src="${game.homeLogo}" alt="${game.home}" class="team-logo" />
        <span class="team-name">${game.homeAbbrev || game.home}</span>
      </div>
      <span class="team-score">${game.status === 'UPCOMING' ? '-' : game.homeScore}</span>
    </div>

    <!-- Barra de Probabilidad de Victoria -->
    <div class="win-prob-container">
      <div class="win-prob-bar away" style="width: ${awayWinProb}%;"></div>
      <div class="win-prob-bar home" style="width: ${homeWinProb}%;"></div>
    </div>
    <div class="win-prob-labels">
      <span>${game.awayAbbrev}: ${awayWinProb}%</span>
      <span>${game.homeAbbrev}: ${homeWinProb}%</span>
    </div>
  `;

  // Evento al hacer clic en la tarjeta
  card.addEventListener('click', () => {
    if (onCardClick) {
      onCardClick(game, homeTeamInfo, awayTeamInfo);
    }
  });

  return card;
}