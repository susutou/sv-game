/** Fetch live Mountain View weather and map to a realistic Bay Area sky theme. */

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
  skyTop: '#6fa8c8',
  skyBottom: '#d9c8a0',
  fog: '#c5d4dc',
  ground: '#5a7a52',
  water: '#3a6a7a',
  sunColor: '#fff2d6',
  sunIntensity: 1.45,
  ambient: '#e8e0d0',
  hemiSky: '#a8c4d8',
  hemiGround: '#5a6a50',
  cloudOpacity: 0.2,
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
      skyTop: '#0c1424',
      skyBottom: '#1a2838',
      fog: '#121c28',
      ground: '#2a3a30',
      water: '#1a3545',
      sunColor: '#c8d4e8',
      sunIntensity: 0.28,
      ambient: '#4a5568',
      hemiSky: '#2a3848',
      hemiGround: '#1a2818',
      cloudOpacity: 0.3,
      showRain: code >= 51 && code < 70,
      showStars: true,
    };
  }

  if (code === 0) {
    return {
      ...base,
      kind: 'clear',
      label: `Clear · ${Math.round(tempC)}°C · Mountain View`,
      skyTop: '#5b9fc4',
      skyBottom: '#e0c898',
      fog: '#c8d8e0',
      ground: '#5c7d54',
      water: '#3a6d7c',
      sunColor: '#fff1d0',
      sunIntensity: 1.55,
      cloudOpacity: 0.12,
    };
  }
  if (code <= 2) {
    return {
      ...base,
      kind: 'partly',
      label: `Partly cloudy · ${Math.round(tempC)}°C`,
      skyTop: '#6a98b0',
      skyBottom: '#d4c4a8',
      fog: '#c0cfd6',
      ground: '#567850',
      water: '#3d6878',
      sunColor: '#f0e0c0',
      sunIntensity: 1.15,
      cloudOpacity: 0.45,
    };
  }
  if (code === 3) {
    return {
      ...base,
      kind: 'cloudy',
      label: `Overcast · ${Math.round(tempC)}°C`,
      skyTop: '#7a8a98',
      skyBottom: '#b0b8c0',
      fog: '#a8b4bc',
      ground: '#4e6e4c',
      water: '#456878',
      sunColor: '#dde2e6',
      sunIntensity: 0.7,
      ambient: '#c8d0d6',
      cloudOpacity: 0.7,
    };
  }
  if (code === 45 || code === 48) {
    return {
      ...base,
      kind: 'fog',
      label: `Bay fog · ${Math.round(tempC)}°C`,
      skyTop: '#9aa8b0',
      skyBottom: '#c8d0d4',
      fog: '#c0c8cc',
      ground: '#5a7060',
      water: '#5a7888',
      sunIntensity: 0.45,
      ambient: '#d0d4d8',
      cloudOpacity: 0.85,
    };
  }
  if (code >= 51 && code <= 67) {
    const storm = code >= 63;
    return {
      ...base,
      kind: storm ? 'storm' : 'rain',
      label: storm ? `Heavy rain · ${Math.round(tempC)}°C` : `Light rain · ${Math.round(tempC)}°C`,
      skyTop: storm ? '#3a4550' : '#5a6a78',
      skyBottom: storm ? '#5a6570' : '#8a9aa4',
      fog: '#7a8890',
      ground: '#4a6450',
      water: '#355868',
      sunColor: '#c0c8d0',
      sunIntensity: 0.4,
      ambient: '#a8b4bc',
      cloudOpacity: 0.85,
      showRain: true,
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      ...base,
      kind: 'snow',
      label: `Cold snap · ${Math.round(tempC)}°C`,
      skyTop: '#90a8bc',
      skyBottom: '#e0e8f0',
      fog: '#d0dce4',
      ground: '#d8e0e6',
      water: '#6a90a4',
      sunIntensity: 0.6,
      cloudOpacity: 0.65,
    };
  }
  if (code >= 80) {
    return {
      ...base,
      kind: 'storm',
      label: `Storm over 101 · ${Math.round(tempC)}°C`,
      skyTop: '#2c3540',
      skyBottom: '#4a5560',
      fog: '#3a4550',
      ground: '#3e5a46',
      water: '#2a4a58',
      sunIntensity: 0.32,
      cloudOpacity: 0.95,
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
