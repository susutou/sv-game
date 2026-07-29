/** Fetch live Mountain View weather and map to a cartoon sky theme. */

export type WeatherKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'storm'
  | 'snow'
  | 'night';

export type WeatherTheme = {
  kind: WeatherKind;
  label: string;
  tempC: number;
  isDay: boolean;
  skyTop: string;
  skyBottom: string;
  fog: string;
  ground: string;
  water: string;
  sunColor: string;
  sunIntensity: number;
  ambient: string;
  hemiSky: string;
  hemiGround: string;
  cloudOpacity: number;
  showRain: boolean;
  showStars: boolean;
};

const FALLBACK: WeatherTheme = {
  kind: 'clear',
  label: 'Sunny in Mountain View',
  tempC: 22,
  isDay: true,
  skyTop: '#4db8ff',
  skyBottom: '#ffe7a8',
  fog: '#b8d9f0',
  ground: '#5ecf7a',
  water: '#3db8d9',
  sunColor: '#ffe566',
  sunIntensity: 1.6,
  ambient: '#fff0c8',
  hemiSky: '#a8dcff',
  hemiGround: '#7bc96f',
  cloudOpacity: 0.25,
  showRain: false,
  showStars: false,
};

function themeFromCode(code: number, isDay: boolean, tempC: number): WeatherTheme {
  const base = { ...FALLBACK, tempC, isDay };

  if (!isDay) {
    return {
      ...base,
      kind: 'night',
      label: 'Night over the Peninsula',
      skyTop: '#0b1a3a',
      skyBottom: '#2a3f6b',
      fog: '#1a2744',
      ground: '#2d5a3d',
      water: '#1a4a6a',
      sunColor: '#dce6ff',
      sunIntensity: 0.35,
      ambient: '#6a7aaa',
      hemiSky: '#3a4a7a',
      hemiGround: '#1a3020',
      cloudOpacity: 0.35,
      showRain: code >= 51 && code < 70,
      showStars: true,
    };
  }

  // WMO weather interpretation codes
  if (code === 0) {
    return {
      ...base,
      kind: 'clear',
      label: `Clear & ${Math.round(tempC)}°C in MV`,
      skyTop: '#3eb5ff',
      skyBottom: '#ffe9a0',
      fog: '#c5e8ff',
      ground: '#62d67f',
      water: '#35c2e0',
      sunColor: '#ffdd44',
      sunIntensity: 1.75,
      cloudOpacity: 0.15,
    };
  }
  if (code <= 2) {
    return {
      ...base,
      kind: 'partly',
      label: `Partly cloudy · ${Math.round(tempC)}°C`,
      skyTop: '#5ab8f0',
      skyBottom: '#ffd9b0',
      fog: '#c8dce8',
      ground: '#58c974',
      water: '#3aabd0',
      sunColor: '#ffd060',
      sunIntensity: 1.35,
      cloudOpacity: 0.55,
    };
  }
  if (code === 3) {
    return {
      ...base,
      kind: 'cloudy',
      label: `Overcast Bay · ${Math.round(tempC)}°C`,
      skyTop: '#7a93a8',
      skyBottom: '#c5d0d8',
      fog: '#a8b8c4',
      ground: '#4db56a',
      water: '#4a8aa0',
      sunColor: '#e8e0c8',
      sunIntensity: 0.85,
      ambient: '#d0d8e0',
      cloudOpacity: 0.85,
    };
  }
  if (code === 45 || code === 48) {
    return {
      ...base,
      kind: 'fog',
      label: `Karl the Fog rolled in · ${Math.round(tempC)}°C`,
      skyTop: '#9aabba',
      skyBottom: '#d8e0e6',
      fog: '#c8d0d6',
      ground: '#6aaa78',
      water: '#7a9aaa',
      sunIntensity: 0.55,
      cloudOpacity: 0.9,
    };
  }
  if (code >= 51 && code <= 67) {
    const storm = code >= 63;
    return {
      ...base,
      kind: storm ? 'storm' : 'rain',
      label: storm ? `Soaking rain · ${Math.round(tempC)}°C` : `Drizzle · ${Math.round(tempC)}°C`,
      skyTop: storm ? '#3a4a5a' : '#6a8598',
      skyBottom: storm ? '#6a7a88' : '#a8bcc8',
      fog: '#8a9aaa',
      ground: '#4a9a62',
      water: '#3a7a90',
      sunColor: '#c8d0d8',
      sunIntensity: 0.5,
      ambient: '#b0c0d0',
      cloudOpacity: 0.95,
      showRain: true,
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      ...base,
      kind: 'snow',
      label: `Snow? In the Valley?! · ${Math.round(tempC)}°C`,
      skyTop: '#a8c4e0',
      skyBottom: '#eef4ff',
      fog: '#d8e6f0',
      ground: '#e8f0f8',
      water: '#8ab8d0',
      sunIntensity: 0.7,
      cloudOpacity: 0.8,
    };
  }
  if (code >= 80) {
    return {
      ...base,
      kind: 'storm',
      label: `Thunder over 101 · ${Math.round(tempC)}°C`,
      skyTop: '#2a3548',
      skyBottom: '#5a6a7a',
      fog: '#4a5a6a',
      ground: '#3a8a55',
      water: '#2a6078',
      sunIntensity: 0.4,
      cloudOpacity: 1,
      showRain: true,
    };
  }

  return {
    ...base,
    label: `Mountain View · ${Math.round(tempC)}°C`,
  };
}

export async function fetchValleyWeather(): Promise<WeatherTheme> {
  try {
    const url =
      'https://api.open-meteo.com/v1/forecast?latitude=37.3861&longitude=-122.0839&current=temperature_2m,weather_code,is_day&timezone=America%2FLos_Angeles';
    const res = await fetch(url);
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    const code = Number(data?.current?.weather_code ?? 0);
    const tempC = Number(data?.current?.temperature_2m ?? 22);
    const isDay = Number(data?.current?.is_day ?? 1) === 1;
    return themeFromCode(code, isDay, tempC);
  } catch {
    return FALLBACK;
  }
}

export { FALLBACK as DEFAULT_WEATHER };
