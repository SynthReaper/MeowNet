// Developed by SynthReaper — https://github.com/SynthReaper/MeowNet
// app/api/weather/route.ts — Full Open-Meteo proxy with rich weather data

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// WMO Weather Interpretation Codes → human description + Material Symbol icon
export const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Clear sky',           icon: 'wb_sunny'      },
  1:  { description: 'Mainly clear',         icon: 'wb_sunny'      },
  2:  { description: 'Partly cloudy',        icon: 'partly_cloudy_day' },
  3:  { description: 'Overcast',             icon: 'cloud'         },
  45: { description: 'Foggy',                icon: 'foggy'         },
  48: { description: 'Icy fog',              icon: 'foggy'         },
  51: { description: 'Light drizzle',        icon: 'rainy'         },
  53: { description: 'Moderate drizzle',     icon: 'rainy'         },
  55: { description: 'Heavy drizzle',        icon: 'rainy'         },
  61: { description: 'Light rain',           icon: 'rainy'         },
  63: { description: 'Moderate rain',        icon: 'rainy'         },
  65: { description: 'Heavy rain',           icon: 'rainy'         },
  71: { description: 'Light snow',           icon: 'ac_unit'       },
  73: { description: 'Moderate snow',        icon: 'ac_unit'       },
  75: { description: 'Heavy snow',           icon: 'ac_unit'       },
  77: { description: 'Snow grains',          icon: 'grain'         },
  80: { description: 'Light showers',        icon: 'rainy'         },
  81: { description: 'Moderate showers',     icon: 'rainy'         },
  82: { description: 'Violent showers',      icon: 'thunderstorm'  },
  85: { description: 'Light snow showers',   icon: 'ac_unit'       },
  86: { description: 'Heavy snow showers',   icon: 'severe_cold'   },
  95: { description: 'Thunderstorm',         icon: 'thunderstorm'  },
  96: { description: 'Thunderstorm + hail',  icon: 'thunderstorm'  },
  99: { description: 'Heavy thunderstorm',   icon: 'thunderstorm'  },
};

// Well-known global cat shelter / colony hotspots used as fallback locations
const CAT_SHELTER_LOCATIONS = [
  { name: 'Istanbul Old City',              lat: 41.01,  lng: 28.97   },
  { name: 'Houtong Cat Village, Taiwan',    lat: 25.09,  lng: 121.82  },
  { name: 'Aoshima Cat Island, Japan',      lat: 32.44,  lng: 132.54  },
  { name: 'Kotor Old Town, Montenegro',     lat: 42.43,  lng: 18.77   },
  { name: 'Rome – Torre Argentina',         lat: 41.90,  lng: 12.48   },
  { name: 'Athens Monastiraki',             lat: 37.97,  lng: 23.73   },
  { name: 'Bangkok Cat Cafes District',     lat: 13.75,  lng: 100.51  },
  { name: 'Essaouira Medina, Morocco',      lat: 31.51,  lng:  -9.76  },
  { name: 'New York – Alley Cat Allies',    lat: 40.75,  lng: -73.99  },
  { name: 'Los Angeles Cat Network',        lat: 34.05,  lng: -118.24 },
  { name: 'London Cats Protection',         lat: 51.51,  lng:  -0.13  },
  { name: 'Sydney Cat Protection Society',  lat: -33.88, lng: 151.21  },
  { name: 'Amsterdam Dierenasiel',          lat: 52.37,  lng:   4.90  },
  { name: 'Prague OSPCA Shelter',           lat: 50.08,  lng:  14.44  },
  { name: 'Kuala Lumpur SPCA',              lat:  3.14,  lng: 101.69  },
];

// Build a rich Open-Meteo URL with current_weather + hourly apparent temp & humidity + daily forecast
function buildUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude:             String(lat),
    longitude:            String(lng),
    current_weather:      'true',
    temperature_unit:     'fahrenheit',
    wind_speed_unit:      'mph',
    precipitation_unit:   'inch',
    timezone:             'auto',
    // Hourly — current hour only (forecast_days=1 → 24 values, we pick index 0)
    hourly:               'apparent_temperature,relative_humidity_2m,precipitation_probability',
    forecast_days:        '1',
    // Daily — today + tomorrow
    daily:                'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weathercode',
    forecast_days_daily:  '3',
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

function parseRich(data: Record<string, unknown>, locationName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cw = (data.current_weather ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hourly = (data.hourly ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daily = (data.daily ?? {}) as any;

  const temp        = Math.round(cw.temperature     ?? 65);
  const windspeed   = Math.round(cw.windspeed       ?? 0);
  const winddir     = Math.round(cw.winddirection    ?? 0);
  const weathercode = cw.weathercode                ?? 0;
  const isDay       = (cw.is_day                    ?? 1) === 1;
  const wmo         = WMO_CODES[weathercode]        ?? WMO_CODES[0];

  // Hourly arrays — pick first non-null value for current conditions
  const apparentTemp  = Math.round((hourly.apparent_temperature?.[0]        ?? temp));
  const humidity      = Math.round((hourly.relative_humidity_2m?.[0]        ?? 50));
  const precipProb    = Math.round((hourly.precipitation_probability?.[0]   ?? 0));

  // Daily — today
  const todayMax      = Math.round(daily.temperature_2m_max?.[0]            ?? temp);
  const todayMin      = Math.round(daily.temperature_2m_min?.[0]            ?? temp);
  const todayPrecip   = daily.precipitation_sum?.[0]                        ?? 0;
  const todayPrecipP  = daily.precipitation_probability_max?.[0]            ?? precipProb;

  return {
    temp, windspeed, winddir, weathercode, isDay,
    description: wmo.description,
    icon:        wmo.icon,
    location:    locationName,
    apparentTemp,
    humidity,
    precipProb:  Math.round(todayPrecipP),
    todayMax, todayMin,
    todayPrecipIn: Number(todayPrecip.toFixed(2)),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // ── Batch mode: ?lats=40.80,40.75,...&lngs=-73.95,-74.00,...
  const latsParam = searchParams.get('lats');
  const lngsParam = searchParams.get('lngs');
  if (latsParam && lngsParam) {
    const lats  = latsParam.split(',').map(Number).filter(n => !isNaN(n));
    const lngs  = lngsParam.split(',').map(Number).filter(n => !isNaN(n));
    const count = Math.min(lats.length, lngs.length);
    try {
      const results = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          fetch(buildUrl(lats[i], lngs[i]), { cache: 'no-store' })
            .then(r => r.json())
            .then(d => parseRich(d, ''))
            .catch(() => ({
              temp: 65, windspeed: 0, winddir: 0, weathercode: 0, isDay: true,
              description: 'Unknown', icon: 'wb_sunny', location: '',
              apparentTemp: 65, humidity: 50, precipProb: 0,
              todayMax: 70, todayMin: 55, todayPrecipIn: 0,
            }))
        )
      );
      return NextResponse.json({ results }, { status: 200 });
    } catch {
      return NextResponse.json({ error: 'batch_failed' }, { status: 500 });
    }
  }

  // ── Single mode: ?lat=X&lng=Y&city=Name  OR  random cat shelter
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  let lat: number, lng: number, locationName: string;

  if (latParam && lngParam && !isNaN(Number(latParam)) && !isNaN(Number(lngParam))) {
    lat          = parseFloat(latParam);
    lng          = parseFloat(lngParam);
    const city = searchParams.get('city');
    if (city && city !== 'Your Location') {
      locationName = city;
    } else {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'MeowNet/1.0 (https://github.com/SynthReaper/MeowNet)',
            },
          }
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json() as any;
          const addr = geoData.address ?? {};
          locationName = addr.city || addr.town || addr.village || addr.county || 'Your Area';
        } else {
          locationName = 'Your Area';
        }
      } catch {
        locationName = 'Your Area';
      }
    }
  } else {
    const randomBuf = new Uint32Array(1);
    crypto.getRandomValues(randomBuf);
    const shelterIndex = randomBuf[0] % CAT_SHELTER_LOCATIONS.length;
    const shelter = CAT_SHELTER_LOCATIONS[shelterIndex];
    lat          = shelter.lat;
    lng          = shelter.lng;
    locationName = shelter.name;
  }

  try {
    const res = await fetch(buildUrl(lat, lng), { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ error: 'upstream_failed' }, { status: 502 });

    const data  = await res.json() as Record<string, unknown>;
    const result = parseRich(data, locationName);

    return NextResponse.json({ ...result, lat, lng }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 });
  }
}
