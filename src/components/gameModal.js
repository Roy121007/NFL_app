/**
 * Maneja la visualización y apertura del modal de detalle de partido.
 */
export function inicializarModal() {
  const modal = document.getElementById('game-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const modalBody = document.getElementById('modal-body');

  // Cerrar al dar clic en la X
  closeBtn.addEventListener('click', cerrarModal);

  // Cerrar al dar clic fuera del contenido del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      cerrarModal();
    }
  });

  function cerrarModal() {
    modal.classList.add('hidden');
  }

  function abrirModal(game, homeTeam, awayTeam) {
    const quarters = game.quarters || { q1: [0,0], q2: [0,0], q3: [0,0], q4: [0,0] };

    modalBody.innerHTML = `
      <div class="modal-header-teams">
        <div class="modal-team">
          <img src="${awayTeam.logo}" alt="${awayTeam.name}" class="modal-logo" />
          <h3>${awayTeam.name}</h3>
          <span class="modal-score">${game.awayScore ?? 0}</span>
        </div>
        <div class="modal-vs">
          <span class="modal-status">${game.status}</span>
        </div>
        <div class="modal-team">
          <img src="${homeTeam.logo}" alt="${homeTeam.name}" class="modal-logo" />
          <h3>${homeTeam.name}</h3>
          <span class="modal-score">${game.homeScore ?? 0}</span>
        </div>
      </div>

      <hr class="modal-divider" />

      <h4>Marcador por Cuartos</h4>
      <table class="quarters-table">
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Q1</th>
            <th>Q2</th>
            <th>Q3</th>
            <th>Q4</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${awayTeam.name}</td>
            <td>${quarters.q1[0]}</td>
            <td>${quarters.q2[0]}</td>
            <td>${quarters.q3[0]}</td>
            <td>${quarters.q4[0]}</td>
            <td><strong>${game.awayScore ?? 0}</strong></td>
          </tr>
          <tr>
            <td>${homeTeam.name}</td>
            <td>${quarters.q1[1]}</td>
            <td>${quarters.q2[1]}</td>
            <td>${quarters.q3[1]}</td>
            <td>${quarters.q4[1]}</td>
            <td><strong>${game.homeScore ?? 0}</strong></td>
          </tr>
        </tbody>
      </table>
    `;

    modal.classList.remove('hidden');
  }

  return { abrirModal, cerrarModal };
}