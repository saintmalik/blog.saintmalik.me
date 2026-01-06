import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
  Marker,
  Annotation
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const geoUrl = "https://raw.githubusercontent.com/lotusms/world-map-data/main/world.json";

const TrafficMap = ({ data }) => {
  const maxRequests = data.length > 0 ? Math.max(...data.map(d => d.requests)) : 1;

  const colorScale = scaleLinear()
    .domain([0, maxRequests])
    .range(["#1e293b", "#10b981"]); // Using emerald/green for Page Views

  return (
    <div className="w-full h-full bg-slate-900/50 rounded-3xl overflow-hidden border border-white/5 relative">
      <ComposableMap
        projectionConfig={{
          rotate: [-10, 0, 0],
          scale: 147
        }}
        width={800}
        height={400}
        style={{ width: "100%", height: "100%" }}
      >
        <Sphere stroke="#ffffff10" strokeWidth={0.5} />
        <Graticule stroke="#ffffff10" strokeWidth={0.5} />
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const countryData = data.find(d => d.country === geo.properties.name || d.country === geo.properties.formal_en);
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={countryData ? colorScale(countryData.requests) : "#1e293b"}
                  stroke="#ffffff20"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#10b981", outline: "none", cursor: 'pointer' },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>

        {data.filter(d => d.requests > 0).map((d) => {
          // We need coordinates. Since we don't have a lookup, we'll try to find the centroid.
          // Note: In a production app, we'd use a static lookup for country centroids.
          return null;
        })}
      </ComposableMap>

      {/* Simplified Overlay for Top Countries instead of Map Labels if Centroids aren't easy */}
      <div className="absolute top-4 right-4 space-y-2 pointer-events-none">
          {data.slice(0, 5).map((d, i) => (
              <div key={i} className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <span className="text-white text-xs font-bold">{d.country}</span>
                  <span className="text-emerald-400 text-xs font-black">{d.requests.toLocaleString()}</span>
              </div>
          ))}
      </div>
    </div>
  );
};

export default TrafficMap;
