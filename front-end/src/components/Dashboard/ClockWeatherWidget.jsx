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
  if ([95, 96, 99].includes(code)) return { label: "Mưa dông", icon: CloudLightning, color: "text-purple-600" };
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
        .catch((error) => {
          console.warn("Lỗi lấy vị trí qua IP, dùng tọa độ mặc định:", error);
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
          // Để tránh tình trạng PC/Desktop bị nhận dạng sai vị trí ở nước ngoài (VD: Mỹ, mạng riêng ảo)
          if (lat >= 8.0 && lat <= 24.0 && lon >= 102.0 && lon <= 110.0) {
            fetchWeather(lat, lon);
            setLocationName("Vị trí của bạn (Thực tế)");
          } else {
            fetchWeatherByIP();
          }
        },
        (error) => {
          // Bị từ chối vị trí hoặc timeout -> Quành về lấy IP
          fetchWeatherByIP();
        },
        { timeout: 7000 } // Chờ định vị GPS lâu nhất 7 giây
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

  return (
    <div className="flex flex-col xl:flex-row gap-6 mb-8 mt-[1px]">
      {/* Clock Widget */}
      <div className="flex-1 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-8 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
        {/* Decorator circles */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-100 mb-2">
            <Clock size={18} />
            <span className="font-medium tracking-wide">THỜI GIAN THỰC TẾ</span>
          </div>
          <p className="text-emerald-50 opacity-90 text-sm capitalize">{formatDate}</p>
        </div>

        <div className="mt-4 relative z-10">
          <h2 className="text-5xl lg:text-6xl font-black tracking-tight drop-shadow-md">
            {time.toLocaleTimeString("vi-VN", { hour12: false, hour: '2-digit', minute: '2-digit' })}
            <span className="text-2xl lg:text-3xl text-emerald-200/80 ml-2 font-bold select-none">{time.toLocaleTimeString("vi-VN", { second: '2-digit' })}</span>
          </h2>
        </div>
      </div>

      {/* Weather Widget */}
      <div className="flex-[2] rounded-3xl border border-gray-100 bg-white shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {/* Current Weather */}
        <div className="p-8 md:w-[45%] flex flex-col justify-center">
          <div className="flex items-center gap-2 text-gray-500 mb-6 font-medium text-sm">
            <MapPin size={16} className="text-emerald-500" />
            <span className="truncate">{locationName}</span>
          </div>

          {loadingWeather || !weatherData ? (
             <div className="animate-pulse space-y-4">
                <div className="h-12 w-24 bg-gray-200 rounded-xl"></div>
                <div className="h-6 w-32 bg-gray-100 rounded-md"></div>
             </div>
          ) : (
             <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-5xl font-bold tracking-tight text-gray-800">
                    {Math.round(weatherData.current.temperature_2m)}°
                  </h2>
                  <p className="text-lg font-medium text-gray-500 mt-1 capitalize">
                    {getWeatherInfo(weatherData.current.weather_code).label}
                  </p>
                  <div className="flex items-center gap-4 mt-6">
                     <div className="flex items-center gap-1.5 text-sm text-gray-500" title="Độ ẩm">
                        <Droplets size={16} className="text-blue-400" />
                        {weatherData.current.relative_humidity_2m}%
                     </div>
                     <div className="flex items-center gap-1.5 text-sm text-gray-500" title="Sức gió">
                        <Wind size={16} className="text-teal-400" />
                        {weatherData.current.wind_speed_10m} km/h
                     </div>
                  </div>
                </div>
                
                {React.createElement(getWeatherInfo(weatherData.current.weather_code).icon, {
                    size: 84,
                    className: getWeatherInfo(weatherData.current.weather_code).color + ' drop-shadow-lg opacity-80',
                })}
             </div>
          )}
        </div>

        {/* 7-Day Forecast */}
        <div className="p-6 md:w-[55%] flex items-center justify-center bg-gray-50/50 rounded-b-3xl md:rounded-bl-none md:rounded-r-3xl">
          {loadingWeather || !weatherData ? (
              <div className="w-full h-full flex items-center justify-center">
                 <div className="inline-block w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full px-1">
                {weatherData.daily.time.slice(0, 6).map((dateStr, index) => {
                  const dayCode = weatherData.daily.weather_code[index];
                  const { icon: DayIcon, color: dayColor } = getWeatherInfo(dayCode);
                  const minT = Math.round(weatherData.daily.temperature_2m_min[index]);
                  const maxT = Math.round(weatherData.daily.temperature_2m_max[index]);
                  return (
                    <div key={dateStr} className="flex flex-col items-center justify-center py-4 px-2 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-md hover:-translate-y-1 cursor-default">
                      <span className="text-xs font-semibold text-gray-500 mb-3">{formatDayName(dateStr)}</span>
                      <DayIcon size={26} className={dayColor + " drop-shadow-sm"} />
                      <div className="mt-4 text-sm font-bold text-gray-700">
                        {maxT}°<span className="text-gray-400 ml-1 font-normal text-xs">{minT}°</span>
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
