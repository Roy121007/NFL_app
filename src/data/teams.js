/**
 * Información de los 32 equipos de la NFL.
 * Incluye logos oficiales en HD y paletas de color para el tema dinámico.
 */
export const teams = {
  // AFC Este
  Bills: { name: 'Buffalo Bills', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', primaryColor: '#00338D', secondaryColor: '#C60C30' },
  Dolphins: { name: 'Miami Dolphins', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', primaryColor: '#008E97', secondaryColor: '#FC4C02' },
  Patriots: { name: 'New England Patriots', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', primaryColor: '#002244', secondaryColor: '#C60C30' },
  Jets: { name: 'New York Jets', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', primaryColor: '#125740', secondaryColor: '#000000' },

  // AFC Norte
  Ravens: { name: 'Baltimore Ravens', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', primaryColor: '#241773', secondaryColor: '#000000' },
  Bengals: { name: 'Cincinnati Bengals', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', primaryColor: '#FB4F14', secondaryColor: '#000000' },
  Browns: { name: 'Cleveland Browns', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', primaryColor: '#311D00', secondaryColor: '#FF3C00' },
  Steelers: { name: 'Pittsburgh Steelers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', primaryColor: '#FFB612', secondaryColor: '#101820' },

  // AFC Sur
  Texans: { name: 'Houston Texans', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', primaryColor: '#03202F', secondaryColor: '#A71930' },
  Colts: { name: 'Indianapolis Colts', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', primaryColor: '#002C5F', secondaryColor: '#A2AAAD' },
  Jaguars: { name: 'Jacksonville Jaguars', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', primaryColor: '#101820', secondaryColor: '#D7A22A' },
  Titans: { name: 'Tennessee Titans', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', primaryColor: '#0C2340', secondaryColor: '#4B92DB' },

  // AFC Oeste
  Broncos: { name: 'Denver Broncos', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', primaryColor: '#FB4F14', secondaryColor: '#002244' },
  Chiefs: { name: 'Kansas City Chiefs', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', primaryColor: '#E31837', secondaryColor: '#FFB81C' },
  Raiders: { name: 'Las Vegas Raiders', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', primaryColor: '#000000', secondaryColor: '#A5ACAF' },
  Chargers: { name: 'Los Angeles Chargers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', primaryColor: '#0080C6', secondaryColor: '#FFC20E' },

  // NFC Este
  Cowboys: { name: 'Dallas Cowboys', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', primaryColor: '#003594', secondaryColor: '#041E42' },
  Giants: { name: 'New York Giants', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', primaryColor: '#0B2265', secondaryColor: '#A71930' },
  Eagles: { name: 'Philadelphia Eagles', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', primaryColor: '#004C54', secondaryColor: '#A5ACAF' },
  Commanders: { name: 'Washington Commanders', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', primaryColor: '#5A1414', secondaryColor: '#FFB612' },

  // NFC Norte
  Bears: { name: 'Chicago Bears', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', primaryColor: '#0B162A', secondaryColor: '#C83803' },
  Lions: { name: 'Detroit Lions', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', primaryColor: '#0076B6', secondaryColor: '#B0B7BC' },
  Packers: { name: 'Green Bay Packers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', primaryColor: '#203731', secondaryColor: '#FFB612' },
  Vikings: { name: 'Minnesota Vikings', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', primaryColor: '#4F2683', secondaryColor: '#FFC62F' },

  // NFC Sur
  Falcons: { name: 'Atlanta Falcons', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', primaryColor: '#A71930', secondaryColor: '#000000' },
  Panthers: { name: 'Carolina Panthers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', primaryColor: '#0085CA', secondaryColor: '#101820' },
  Saints: { name: 'New Orleans Saints', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', primaryColor: '#D3BC8D', secondaryColor: '#101820' },
  Buccaneers: { name: 'Tampa Bay Buccaneers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', primaryColor: '#D50A0A', secondaryColor: '#34302B' },

  // NFC Oeste
  Cardinals: { name: 'Arizona Cardinals', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', primaryColor: '#97233F', secondaryColor: '#000000' },
  Rams: { name: 'Los Angeles Rams', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', primaryColor: '#003594', secondaryColor: '#FFA300' },
  SF49ers: { name: 'San Francisco 49ers', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', primaryColor: '#AA0000', secondaryColor: '#B3995D' },
  Seahawks: { name: 'Seattle Seahawks', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', primaryColor: '#002244', secondaryColor: '#69BE28' }
};