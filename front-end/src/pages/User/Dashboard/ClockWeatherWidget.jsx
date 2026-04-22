import React, { useState, useEffect } from "react";
import {
  Sun,
  Cloud,
  CloudFog,
  CloudRain,
  CloudLightning,
  Wind,
  Droplets,
  MapPin,
  Clock,
} from "lucide-react";

// Default coordinates: Cần Thơ (Mekong Delta is famous for rice fields)
const DEFAULT_LAT = 10.0452;
const DEFAULT_LON = 105.7469;

const getWeatherInfo = (code) => {
  if (code === 0) return { label: "Trời nắng", icon: Sun, color: "text-amber-500" };
  if ([1, 2, 3].includes(code)) return { label: "Nhiều mây", icon: Cloud, color: "text-gray-400" };
  if ([45, 48].includes(code)) return { label: "Sương mù", icon: CloudFog, color: "text-slate-400" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Mưa phùn", icon: CloudRain, color: "text-blue-400" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Có mưa", icon: CloudRain, color: "text-blue-500" };
  if ([95, 96, 99].includes(code)) return { label: "Mưa dông", icon: CloudLightning, color: "text-violet-600" };
  return { label: "Bình thường", icon: Cloud, color: "text-gray-400" };
};

const formatDayName = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  return days[date.getDay()];
};

const ClockWeatherWidget = () => {
  const [time, setTime] = useState(new Date());
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [locationName, setLocationName] = useState("Khu vực Canh tác");

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchWeather = async (lat, lon) => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        const data = await res.json();
        setWeatherData(data);
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thời tiết:", error);
      } finally {
        setLoadingWeather(false);
      }
    };

    const fetchWeatherByIP = () => {
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          if (data.latitude && data.longitude) {
            fetchWeather(data.latitude, data.longitude);
            setLocationName(data.city ? `${data.city}, ${data.region}` : "Khu vực của bạn");
          } else {
            fetchWeather(DEFAULT_LAT, DEFAULT_LON);
            setLocationName("Đồng bằng sông Cửu Long (Mặc định)");
          }
        })
        .catch(() => {
          fetchWeather(DEFAULT_LAT, DEFAULT_LON);
          setLocationName("Đồng bằng sông Cửu Long (Mặc định)");
        });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          // Kiểm tra xem vị trí GPS có nằm trong biên giới Việt Nam không
          if (lat >= 8.0 && lat <= 24.0 && lon >= 102.0 && lon <= 110.0) {
            fetchWeather(lat, lon);
            setLocationName("Vị trí của bạn (Thực tế)");
          } else {
            fetchWeatherByIP();
          }
        },
        () => fetchWeatherByIP(),
        { timeout: 7000 }
      );
    } else {
      fetchWeatherByIP();
    }
  }, []);

  const formatDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(time);

  const currentWeather = weatherData?.current;
  const weatherInfo = currentWeather ? getWeatherInfo(currentWeather.weather_code) : null;
  const WeatherIcon = weatherInfo?.icon;

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      {/* Clock — compact */}
      <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-5 text-white shadow-lg shadow-emerald-900/15 xl:w-[280px]">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-200">
            <Clock size={12} />
            Thời gian thực
          </div>
          <p className="mt-1 text-xs capitalize text-emerald-100/80">{formatDate}</p>
        </div>
        <div className="relative z-10 mt-3">
          <h2 className="text-4xl font-black tracking-tight">
            {time.toLocaleTimeString("vi-VN", { hour12: false, hour: "2-digit", minute: "2-digit" })}
            <span className="ml-1.5 text-lg font-bold text-emerald-200/70">
              {String(time.getSeconds()).padStart(2, "0")}
            </span>
          </h2>
        </div>
      </div>

      {/* Weather — compact */}
      <div className="flex flex-1 flex-col divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white shadow-sm md:flex-row md:divide-x md:divide-y-0">
        {/* Current */}
        <div className="flex items-center gap-5 p-5 md:w-[40%]">
          {loadingWeather || !weatherData ? (
            <div className="animate-pulse space-y-3 w-full">
              <div className="h-10 w-20 rounded-lg bg-gray-200" />
              <div className="h-4 w-28 rounded bg-gray-100" />
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <MapPin size={12} className="shrink-0 text-emerald-500" />
                  <span className="truncate">{locationName}</span>
                </div>
                <h2 className="mt-1 text-4xl font-bold tracking-tight text-gray-800">
                  {Math.round(currentWeather.temperature_2m)}°
                </h2>
                <p className="mt-0.5 text-sm font-medium capitalize text-gray-500">
                  {weatherInfo.label}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1" title="Độ ẩm">
                    <Droplets size={13} className="text-blue-400" />
                    {currentWeather.relative_humidity_2m}%
                  </span>
                  <span className="flex items-center gap-1" title="Sức gió">
                    <Wind size={13} className="text-teal-400" />
                    {currentWeather.wind_speed_10m} km/h
                  </span>
                </div>
              </div>
              {WeatherIcon && (
                <WeatherIcon size={56} className={`shrink-0 opacity-70 drop-shadow-md ${weatherInfo.color}`} />
              )}
            </>
          )}
        </div>

        {/* Forecast */}
        <div className="flex items-center justify-center bg-gray-50/40 p-4 md:w-[60%] md:rounded-r-2xl">
          {loadingWeather || !weatherData ? (
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          ) : (
            <div className="grid w-full grid-cols-3 gap-1 sm:grid-cols-6">
              {weatherData.daily.time.slice(0, 6).map((dateStr, i) => {
                const dayCode = weatherData.daily.weather_code[i];
                const { icon: DayIcon, color: dayColor } = getWeatherInfo(dayCode);
                const minT = Math.round(weatherData.daily.temperature_2m_min[i]);
                const maxT = Math.round(weatherData.daily.temperature_2m_max[i]);
                return (
                  <div
                    key={dateStr}
                    className="flex cursor-default flex-col items-center rounded-xl px-1.5 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                  >
                    <span className="text-[10px] font-semibold text-gray-500">{formatDayName(dateStr)}</span>
                    <DayIcon size={20} className={`mt-1.5 ${dayColor} drop-shadow-sm`} />
                    <div className="mt-1.5 text-xs font-bold text-gray-700">
                      {maxT}°<span className="ml-0.5 font-normal text-gray-400">{minT}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockWeatherWidget;
