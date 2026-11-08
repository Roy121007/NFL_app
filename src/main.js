import './style.css';

const games = [
  {home:'Patriots', away:'Packers', homeScore: 27, awayScore: 17, status:'FINAL'}, {home:'Falcons', away:'Bengals', homeScore: 21, awayScore: 35, status:'FINAL'}, {home:'Vikings', away:'Bills', homeScore:38, awayScore: 28, status:'FINAL'}
];

const contenedor = document.getElementById('app');

function crearTarjeta(game){
  const card = document.createElement('div');

  card.className = 'game-card';

  card.textContent = `${game.away} ${game.awayScore} - ${game.home} ${game.homeScore}`;
  
  return card;
}

games.forEach(game => {
  contenedor.appendChild(crearTarjeta(game));
});
