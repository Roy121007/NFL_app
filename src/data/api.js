/**
 * Módulo para obtener datos en tiempo real de la NFL desde la API pública de ESPN.
 */
const BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

/**
 * Convierte una fecha ISO UTC al formato de México (Ej: "Dom 5 Nov, 12:00 PM")
 */
function formatearFechaMexico(dateString) {
  if (!dateString) return 'Programado';
  
  const date = new Date(dateString);
  
  // Formateador en español configurado para la zona horaria de México/Guadalajara
  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return formatter.format(date);
}

export async function obtenerPartidosNFL(week = null) {
  try {
    const params = new URLSearchParams({ seasontype: '2' });
    if (week) params.append('week', week);

    const response = await fetch(`${BASE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    const currentWeekNumber = data.week?.number || week || 9;
    const events = data.events || [];

    const games = events.map(event => {
      const competition = event.competitions?.[0] || {};
      const competitors = competition.competitors || [];
      const statusType = event.status?.type?.state; // 'pre', 'in', 'post'

      let status = 'UPCOMING';
      if (statusType === 'in') status = 'LIVE';
      if (statusType === 'post') status = 'FINAL';

      // Formatear detalle de estado (si no ha empezado, mostrar fecha/hora en México)
      let statusDetail = event.status?.type?.shortDetail || 'Programado';
      if (status === 'UPCOMING' && event.date) {
        statusDetail = formatearFechaMexico(event.date);
      } else if (status === 'FINAL') {
        statusDetail = 'FINAL';
      }

      const homeCompetitor = competitors.find(c => c.homeAway === 'home') || competitors[0] || {};
      const awayCompetitor = competitors.find(c => c.homeAway === 'away') || competitors[1] || {};

      const situation = competition.situation || {};
      const predictor = competition.predictor || {};
      
      const homeScore = parseInt(homeCompetitor.score || '0', 10);
      const awayScore = parseInt(awayCompetitor.score || '0', 10);

      // Algoritmo de probabilidad dinámica
      let homeWinProb = 50;
      if (predictor.homeChance) {
        homeWinProb = Math.round(predictor.homeChance * 100);
      } else if (status === 'FINAL') {
        homeWinProb = homeScore > awayScore ? 100 : (homeScore < awayScore ? 0 : 50);
      } else if (status === 'LIVE' || homeScore !== awayScore) {
        const diff = homeScore - awayScore;
        homeWinProb = Math.min(Math.max(50 + (diff * 5), 5), 95);
      } else {
        const seed = (event.id.slice(-2) % 30) - 15; 
        homeWinProb = 50 + seed;
      }
      
      const awayWinProb = 100 - homeWinProb;

      const getLinescores = (comp) => {
        const lines = comp?.linescores || [];
        return [
          lines[0]?.value ?? 0,
          lines[1]?.value ?? 0,
          lines[2]?.value ?? 0,
          lines[3]?.value ?? 0
        ];
      };

      const awayQuarters = getLinescores(awayCompetitor);
      const homeQuarters = getLinescores(homeCompetitor);
      const defaultLogo = 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/nfl.png';

      return {
        id: event.id,
        week: currentWeekNumber,
        home: homeCompetitor.team?.name || homeCompetitor.team?.displayName || 'Local',
        homeAbbrev: homeCompetitor.team?.abbreviation || 'HOM',
        homeLogo: homeCompetitor.team?.logo || homeCompetitor.team?.logos?.[0]?.href || defaultLogo,
        homeScore: homeScore,
        
        away: awayCompetitor.team?.name || awayCompetitor.team?.displayName || 'Visitante',
        awayAbbrev: awayCompetitor.team?.abbreviation || 'AWY',
        awayLogo: awayCompetitor.team?.logo || awayCompetitor.team?.logos?.[0]?.href || defaultLogo,
        awayScore: awayScore,

        status: status,
        statusDetail: statusDetail,
        redZone: situation.isRedZone || false,
        winProbability: { home: homeWinProb, away: awayWinProb },
        quarters: {
          q1: [awayQuarters[0], homeQuarters[0]],
          q2: [awayQuarters[1], homeQuarters[1]],
          q3: [awayQuarters[2], homeQuarters[2]],
          q4: [awayQuarters[3], homeQuarters[3]]
        }
      };
    });

    return {
      week: currentWeekNumber,
      games: games
    };

  } catch (error) {
    console.error('Error al conectar con la API de ESPN:', error);
    return { week: week || 9, games: [] };
  }
}