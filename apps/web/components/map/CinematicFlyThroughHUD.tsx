'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  X,
  Compass,
  Mountain,
  Navigation,
  Sparkles,
  ChevronDown,
  Layers,
  Eye,
  Sliders,
  Wind,
} from 'lucide-react';
import { ANCESTRAL_MIGRATION_ARCS, WATERWAY_TRADE_CORRIDORS } from '@/lib/cultural';

export interface WaypointInfo {
  name: string;
  coords: [number, number];
  note: string;
  altitudeMeters: number;
}

export interface FlightCorridorItem {
  id: string;
  name: string;
  type: 'migration' | 'waterway';
  era: string;
  description: string;
  waypoints: WaypointInfo[];
}

interface CinematicFlyThroughHUDProps {
  activeCorridor: FlightCorridorItem;
  currentWaypointIndex: number;
  totalWaypoints: number;
  isPlaying: boolean;
  bearing: number;
  pitch: number;
  speed: number;
  onTogglePlay: () => void;
  onNextWaypoint: () => void;
  onPrevWaypoint: () => void;
  onChangeSpeed: (newSpeed: number) => void;
  onSelectCorridor: (corridorId: string) => void;
  onExit: () => void;
}

export function CinematicFlyThroughHUD({
  activeCorridor,
  currentWaypointIndex,
  totalWaypoints,
  isPlaying,
  bearing,
  pitch,
  speed,
  onTogglePlay,
  onNextWaypoint,
  onPrevWaypoint,
  onChangeSpeed,
  onSelectCorridor,
  onExit,
}: CinematicFlyThroughHUDProps) {
  const [showCorridorPicker, setShowCorridorPicker] = useState(false);

  const currentWp = activeCorridor.waypoints[currentWaypointIndex] || {
    name: 'Gliding along ancestral corridor',
    note: activeCorridor.description,
    altitudeMeters: 1800,
  };

  const progressPct = totalWaypoints > 1 ? Math.round((currentWaypointIndex / (totalWaypoints - 1)) * 100) : 100;

  // Cardinal direction from bearing
  const normalizedBearing = ((bearing % 360) + 360) % 360;
  const cardinalDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const cardinal = cardinalDirections[Math.round(normalizedBearing / 45) % 8];

  return (
    <div className="fixed sm:absolute inset-x-0 bottom-[64px] sm:bottom-6 z-50 flex flex-col items-center pointer-events-none px-3 sm:px-4 select-none animate-in fade-in duration-300">
      {/* Top Floating Commentary Card */}
      <div className="pointer-events-auto max-w-xl w-full mb-3 bg-[#0a0f1d]/90 border border-emerald-500/30 rounded-2xl shadow-2xl backdrop-blur-xl p-3.5 sm:p-4 text-white">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-[10px] font-mono font-semibold tracking-wider text-emerald-400 uppercase">
              3D Cinematic Fly-Through
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              • {activeCorridor.era}
            </span>
          </div>

          {/* Corridor Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCorridorPicker(!showCorridorPicker)}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <span>Switch Corridor</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCorridorPicker && (
              <div className="absolute right-0 bottom-full mb-2 w-72 bg-[#090e1c] border border-white/15 rounded-xl shadow-2xl p-2 z-50 max-h-64 overflow-y-auto">
                <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Ancestral Migration Arcs
                </div>
                {ANCESTRAL_MIGRATION_ARCS.map((arc) => (
                  <button
                    key={arc.id}
                    onClick={() => {
                      onSelectCorridor(arc.id);
                      setShowCorridorPicker(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      activeCorridor.id === arc.id
                        ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{arc.name}</span>
                  </button>
                ))}

                <div className="text-[10px] font-mono text-slate-400 px-2 py-1 mt-2 uppercase tracking-wider">
                  Waterway Trade Highways
                </div>
                {WATERWAY_TRADE_CORRIDORS.map((water) => (
                  <button
                    key={water.id}
                    onClick={() => {
                      onSelectCorridor(water.id);
                      setShowCorridorPicker(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      activeCorridor.id === water.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{water.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Title & Live Waypoint Note */}
        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
          <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{activeCorridor.name}</span>
        </h3>

        <div className="mt-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs text-slate-300 flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-semibold text-slate-100">{currentWp.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              {currentWp.note}
            </div>
          </div>
        </div>

        {/* Live Cockpit Telemetry Bar */}
        <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-200">
              {Math.round(normalizedBearing)}° {cardinal}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Mountain className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-200">
              Pitch {Math.round(pitch)}° • ~{currentWp.altitudeMeters.toLocaleString()}m DEM
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-200">
              Waypoint {currentWaypointIndex + 1}/{totalWaypoints} ({progressPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Flight Control Deck Bar */}
      <div className="pointer-events-auto bg-[#0a0f1d]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl px-4 py-2.5 flex items-center gap-3 text-white">
        {/* Previous Waypoint */}
        <button
          onClick={onPrevWaypoint}
          disabled={currentWaypointIndex === 0}
          title="Previous Waypoint"
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play / Pause Flight */}
        <button
          onClick={onTogglePlay}
          className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-black" />
              <span>Pause Flight</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-black" />
              <span>Resume Flight</span>
            </>
          )}
        </button>

        {/* Next Waypoint */}
        <button
          onClick={onNextWaypoint}
          disabled={currentWaypointIndex >= totalWaypoints - 1}
          title="Next Waypoint"
          className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Speed multiplier toggle */}
        <button
          onClick={() => onChangeSpeed(speed === 1 ? 2 : speed === 2 ? 3 : 1)}
          className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-emerald-400 transition-colors"
        >
          {speed}x
        </button>

        <div className="h-5 w-[1px] bg-white/10 mx-1" />

        {/* Exit Flight Mode */}
        <button
          onClick={onExit}
          title="Exit 3D Fly-Through"
          className="p-2 rounded-xl hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
