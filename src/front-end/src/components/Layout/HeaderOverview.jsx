import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Droplets,
  MapPin,
  Sun,
  Wind,
} from "lucide-react";

const DEFAULT_LAT = 10.0452;
const DEFAULT_LON = 105.7469;
const DEFAULT_LOCATION = "Đồng bằng sông Cửu Long";

const getWeatherInfo = (code) => {
  if (code === 0)
    return { label: "Trời nắng", icon: Sun, color: "text-amber-500" };
  if ([1, 2, 3].includes(code))
    return { label: "Nhiều mây", icon: Cloud, color: "text-slate-500" };
  if ([45, 48].includes(code))
    return { label: "Sương mù", icon: CloudFog, color: "text-slate-400" };
  if ([51, 53, 55, 56, 57].includes(code)) {
    return { label: "Mưa phùn", icon: CloudRain, color: "text-sky-500" };
  }
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { label: "Có mưa", icon: CloudRain, color: "text-blue-500" };
  }
  if ([95, 96, 99].includes(code)) {
    return {
      label: "Mưa dông",
      icon: CloudLightning,
      color: "text-violet-600",
    };
  }
  return { label: "Bình thường", icon: Cloud, color: "text-slate-500" };
};

const HeaderOverview = ({ className = "" }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [locationName, setLocationName] = useState(DEFAULT_LOCATION);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applyWeather = (data) => {
      if (!isMounted) return;
      setWeatherData(data);
      setIsLoadingWeather(false);
    };

    const applyLocation = (label) => {
      if (!isMounted) return;
      setLocationName(label);
    };

    const fetchWeather = async (lat, lon) => {
      try {
        const OPEN_METEO_BASE =
          import.meta.env.VITE_OPEN_METEO_URL?.trim() ||
          "https://api.open-meteo.com/v1/forecast";
        const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error("Khong the tai du lieu thoi tiet");
        }

        const data = await response.json();
        applyWeather(data);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thời tiết:", error);
        if (isMounted) {
          setIsLoadingWeather(false);
        }
      }
    };

    const fetchFallbackWeather = () => {
      applyLocation(DEFAULT_LOCATION);
      fetchWeather(DEFAULT_LAT, DEFAULT_LON);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          if (
            latitude >= 8 &&
            latitude <= 24 &&
            longitude >= 102 &&
            longitude <= 110
          ) {
            fetchWeather(latitude, longitude);
            applyLocation("Vị trí của bạn");
            return;
          }

          fetchFallbackWeather();
        },
        () => fetchFallbackWeather(),
        { timeout: 7000 },
      );
    } else {
      fetchFallbackWeather();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const currentWeather = weatherData?.current;
  const weatherInfo = currentWeather
    ? getWeatherInfo(currentWeather.weather_code)
    : null;
  const WeatherIcon = weatherInfo?.icon || Sun;
  const humidityUnit = weatherData?.current_units?.relative_humidity_2m || "%";
  const windUnit = weatherData?.current_units?.wind_speed_10m || "km/h";

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-800 ring-1 ring-emerald-100">
          <CalendarDays size={14} className="shrink-0 text-emerald-600" />
          <span className="truncate capitalize">{formattedDate}</span>
        </div>

        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 font-semibold text-sky-900 ring-1 ring-sky-100">
          {isLoadingWeather ? (
            <span className="text-sky-700">Đang tải thời tiết...</span>
          ) : currentWeather && weatherInfo ? (
            <>
              <WeatherIcon
                size={16}
                className={`shrink-0 ${weatherInfo.color}`}
              />
              <span>{Math.round(currentWeather.temperature_2m)}°C</span>
            </>
          ) : (
            <span className="text-sky-700">
              Chưa lấy được dữ liệu thời tiết
            </span>
          )}
        </div>

        <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200">
          <MapPin size={13} className="shrink-0 text-emerald-500" />
          <span className="truncate">{locationName}</span>
        </div>

        {currentWeather ? (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200">
              <Droplets size={13} className="text-sky-500" />
              <span>
                {currentWeather.relative_humidity_2m}
                {humidityUnit}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-medium text-gray-600 ring-1 ring-gray-200">
              <Wind size={13} className="text-teal-500" />
              <span>
                {currentWeather.wind_speed_10m}
                {windUnit}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default HeaderOverview;
