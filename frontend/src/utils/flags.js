// Country/Team name to ISO 3166-1 alpha-2 code mapping for flag images
const teamToCountryCode = {
  'Mexico': 'mx', 'South Africa': 'za', 'USA': 'us', 'United States': 'us',
  'Iran': 'ir', 'Brazil': 'br', 'Cameroon': 'cm', 'Argentina': 'ar',
  'Nigeria': 'ng', 'England': 'gb-eng', 'Tunisia': 'tn', 'France': 'fr',
  'Australia': 'au', 'Portugal': 'pt', 'Morocco': 'ma', 'Spain': 'es',
  'Japan': 'jp', 'Germany': 'de', 'Saudi Arabia': 'sa', 'Netherlands': 'nl',
  'Senegal': 'sn', 'South Korea': 'kr', 'Czechia': 'cz', 'Canada': 'ca',
  'Bosnia-Herzegovina': 'ba', 'Bosnia': 'ba', 'Qatar': 'qa', 'Switzerland': 'ch',
  'Paraguay': 'py', 'Turkey': 'tr', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'Curaçao': 'cw', 'Ivory Coast': 'ci', "Côte d'Ivoire": 'ci', 'Ecuador': 'ec',
  'Sweden': 'se', 'Cape Verde Islands': 'cv', 'Cape Verde': 'cv', 'Uruguay': 'uy',
  'Belgium': 'be', 'Egypt': 'eg', 'New Zealand': 'nz', 'Iraq': 'iq',
  'Norway': 'no', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  'Congo DR': 'cd', 'DR Congo': 'cd', 'Uzbekistan': 'uz', 'Colombia': 'co',
  'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
  'Albania': 'al', 'Kosova': 'xk', 'Kosovo': 'xk', 'Serbia': 'rs',
  'Greece': 'gr', 'Montenegro': 'me', 'North Macedonia': 'mk', 'Wales': 'gb-wls',
  'Czech Republic': 'cz', 'Iceland': 'is', 'Slovenia': 'si',
  'Tirana': 'al', 'Partizani': 'al', 'Skënderbeu': 'al', 'Prishtina': 'xk',
  'Drita': 'xk', 'Balkan': 'xk', 'Ferizaj': 'xk',
  'Italy': 'it', 'Denmark': 'dk', 'Poland': 'pl', 'Russia': 'ru',
  'Ukraine': 'ua', 'Hungary': 'hu', 'Romania': 'ro', 'Bulgaria': 'bg',
  'Slovakia': 'sk', 'Northern Ireland': 'gb-nir', 'Republic of Ireland': 'ie',
  'Ireland': 'ie', 'China': 'cn', 'India': 'in', 'Chile': 'cl',
  'Peru': 'pe', 'Venezuela': 've', 'Costa Rica': 'cr', 'Jamaica': 'jm',
  'Honduras': 'hn', 'El Salvador': 'sv', 'Trinidad and Tobago': 'tt',
  'Guatemala': 'gt', 'Cuba': 'cu', 'Dominican Republic': 'do',
};

const FLAG_BASE_URL = 'https://flagcdn.com/16x12';

export function getFlagUrl(teamName) {
  if (!teamName) return null;
  const code = teamToCountryCode[teamName];
  if (!code) return null;
  return `${FLAG_BASE_URL}/${code}.png`;
}

/**
 * Get flag emoji for a team (works in modern browsers)
 */
export function getFlagEmoji(teamName) {
  if (!teamName) return '';
  const code = teamToCountryCode[teamName];
  if (!code) return '🏳️';
  const base = code.split('-')[0].toUpperCase();
  if (base.length !== 2) return '🏳️';
  const codePoints = base.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

export default { getFlagUrl, getFlagEmoji, teamToCountryCode };