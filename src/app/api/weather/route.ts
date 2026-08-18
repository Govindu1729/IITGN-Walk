import { NextResponse } from "next/server";

/**
 * Simulated weather API for IITGN campus (Gandhinagar, Gujarat).
 * Returns realistic values based on the current month since we can't
 * call external weather APIs.
 *
 * Gandhinagar climate reference:
 * - Summer (Mar–Jun): very hot, 38–45°C, dry
 * - Monsoon (Jul–Sep): hot + humid, 28–35°C, rainy
 * - Post-monsoon (Oct–Nov): warm, 25–33°C
 * - Winter (Dec–Feb): mild, 12–25°C
 */

interface WeatherData {
  temperature: number;
  condition: "Sunny" | "Cloudy" | "Rainy" | "Hot";
  humidity: number;
  windSpeed: number;
  /** Weather impact factor: 1.0 = normal, <1.0 = slower walking */
  impactFactor: number;
  description: string;
  icon: string;
}

function getSimulatedWeather(): WeatherData {
  const now = new Date();
  const month = now.getMonth(); // 0=Jan, 7=Aug
  const hour = now.getHours();

  // Seed a pseudo-random but deterministic value from the date so it's
  // stable within the same hour but varies across the day
  const seed = now.getFullYear() * 10000 + (month + 1) * 100 + now.getDate() + hour;
  const jitter = ((seed * 9301 + 49297) % 233280) / 233280; // 0..1

  let temperature: number;
  let condition: WeatherData["condition"];
  let humidity: number;
  let windSpeed: number;
  let impactFactor = 1.0;
  let description: string;
  let icon: string;

  // Monthly climate bands for Gandhinagar
  if (month >= 2 && month <= 5) {
    // Summer: Mar–Jun
    const baseTemp = 38 + jitter * 7; // 38–45
    temperature = Math.round(baseTemp * 10) / 10;
    humidity = Math.round(20 + jitter * 20); // 20–40%
    windSpeed = Math.round((8 + jitter * 12) * 10) / 10; // 8–20 km/h
    if (temperature > 42) {
      condition = "Hot";
      impactFactor = 0.9;
      description = "Very hot — walking slower than usual";
      icon = "thermometer-sun";
    } else {
      condition = "Sunny";
      description = "Hot and sunny — stay hydrated";
      icon = "sun";
    }
  } else if (month >= 6 && month <= 8) {
    // Monsoon: Jul–Sep
    const baseTemp = 28 + jitter * 7; // 28–35
    temperature = Math.round(baseTemp * 10) / 10;
    humidity = Math.round(70 + jitter * 25); // 70–95%
    windSpeed = Math.round((10 + jitter * 20) * 10) / 10; // 10–30 km/h

    // In monsoon, ~60% chance of rain at any given hour
    const rainChance = ((seed * 1337 + 42) % 100);
    if (rainChance < 60) {
      condition = "Rainy";
      impactFactor = 0.85;
      description = "Rain may slow walking — ETAs adjusted ×0.85";
      icon = "cloud-rain";
    } else if (rainChance < 80) {
      condition = "Cloudy";
      description = "Overcast and humid";
      icon = "cloud";
    } else {
      condition = "Cloudy";
      description = "Monsoon break — cloudy & humid";
      icon = "cloud-sun";
    }
  } else if (month >= 9 && month <= 10) {
    // Post-monsoon: Oct–Nov
    const baseTemp = 25 + jitter * 8; // 25–33
    temperature = Math.round(baseTemp * 10) / 10;
    humidity = Math.round(40 + jitter * 25); // 40–65%
    windSpeed = Math.round((5 + jitter * 10) * 10) / 10;
    condition = jitter > 0.5 ? "Sunny" : "Cloudy";
    description = condition === "Sunny" ? "Pleasant weather" : "Partly cloudy";
    icon = condition === "Sunny" ? "sun" : "cloud-sun";
  } else {
    // Winter: Dec–Feb
    const baseTemp = 12 + jitter * 13; // 12–25
    temperature = Math.round(baseTemp * 10) / 10;
    humidity = Math.round(30 + jitter * 30); // 30–60%
    windSpeed = Math.round((3 + jitter * 8) * 10) / 10;
    condition = jitter > 0.6 ? "Sunny" : "Cloudy";
    description = condition === "Sunny" ? "Cool and pleasant" : "Mild winter day";
    icon = condition === "Sunny" ? "sun" : "cloud";
  }

  // Override impact for very high temps regardless of month
  if (temperature > 38 && impactFactor === 1.0) {
    impactFactor = 0.9;
    description = "Very hot — walking pace reduced";
  }

  return {
    temperature,
    condition,
    humidity,
    windSpeed,
    impactFactor,
    description,
    icon,
  };
}

export async function GET() {
  const weather = getSimulatedWeather();
  return NextResponse.json(weather);
}
