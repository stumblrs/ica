'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Sparkles, Sun, Droplets, Leaf, Wind, ChevronRight } from 'lucide-react';
import { getIgboMarketDay, IGBO_MARKET_DAYS } from '@/lib/cultural';

interface TraditionalCalendarWidgetProps {
  onFilterMarketDay?: (dayName: string) => void;
  selectedMarketFilter?: string | null;
}

export function TraditionalCalendarWidget({
  onFilterMarketDay,
  selectedMarketFilter,
}: TraditionalCalendarWidgetProps = {}) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const todayMarket = useMemo(() => getIgboMarketDay(new Date()), []);
  const calculatedMarket = useMemo(() => {
    return getIgboMarketDay(new Date(selectedDate));
  }, [selectedDate]);

  // Determine current cultural festival season based on month
  const currentFestivalSeason = useMemo(() => {
    const month = new Date().getMonth(); // 0 to 11
    if (month >= 7 && month <= 9) {
      return {
        name: 'Emume Iwa Ji (New Yam Festival Season)',
        period: 'August – October',
        desc: 'Sacred harvest celebration giving thanksgiving to Ala (Earth goddess) and ancestors for the first yams.',
        highlight: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
      };
    } else if (month >= 10 && month <= 11) {
      return {
        name: 'Ofala & Mmanwu Festival Season',
        period: 'November – December',
        desc: 'Royal coronations, ancestral masquerade displays, and return of the diaspora.',
        highlight: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
      };
    } else if (month >= 2 && month <= 4) {
      return {
        name: 'Ikeji & Planting Season Festivals',
        period: 'March – May',
        desc: 'Clearing of farm ridges, invocation of rainfall, and Aro Ikeji masquerade spectacles.',
        highlight: 'text-sky-300 border-sky-500/30 bg-sky-500/10',
      };
    }
    return {
      name: 'Igu Aro & Traditional Lunar New Year',
      period: 'January – February',
      desc: 'Nri royal calendar proclamation, clearing of sacred shrines, and peace covenants.',
      highlight: 'text-purple-300 border-purple-500/30 bg-purple-500/10',
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Today's Market Day Showcase Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1427] to-[#080d1a] border border-amber-500/30 p-4 shadow-xl">
        <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-amber-400">
            <Sparkles className="w-3 h-3" /> Traditional 4-Day Week (Izu)
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Today: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <h4 className="text-2xl font-display font-black text-white tracking-tight">
            {todayMarket.name} Day
          </h4>
          <span className="text-lg">{todayMarket.symbol}</span>
          <span className="text-xs text-amber-300/80 font-mono">
            ({todayMarket.element})
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
          Presided by <strong className="text-slate-200">{todayMarket.spirit}</strong>. Communities holding their primary traditional market on {todayMarket.name} are active in commerce today.
        </p>

        {/* 4-Day Cycle Track */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/[0.08]">
          {IGBO_MARKET_DAYS.map((d, idx) => {
            const isToday = idx === todayMarket.index;
            const isSelected = selectedMarketFilter === d.name;
            return (
              <button
                key={d.name}
                type="button"
                onClick={() => onFilterMarketDay?.(d.name)}
                className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-400 border-amber-300 text-black shadow-lg shadow-amber-400/30 scale-[1.03] font-bold'
                    : isToday
                    ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-md shadow-amber-950/50 ring-1 ring-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
                title={`Click to filter traditional ${d.name} markets across the map`}
              >
                <span className="text-xs block mb-0.5">{d.symbol}</span>
                <span className={`text-[11px] block ${isSelected ? 'font-black text-black' : 'font-bold'}`}>
                  {d.name}
                </span>
                <span className={`text-[8px] font-mono uppercase tracking-widest block mt-0.5 ${isSelected ? 'text-black/70' : 'text-slate-400'}`}>
                  {isToday ? 'Today' : `Day ${idx + 1}`}
                </span>
              </button>
            );
          })}
        </div>
        {selectedMarketFilter && (
          <div className="mt-2.5 flex items-center justify-between text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
            <span className="text-amber-300">
              Filtering markets holding trade on <strong className="font-bold text-white">{selectedMarketFilter}</strong>
            </span>
            <button
              type="button"
              onClick={() => onFilterMarketDay?.(selectedMarketFilter)}
              className="text-amber-400 hover:text-white font-mono underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Seasonal Cultural Festival Banner */}
      <div className={`p-3.5 rounded-xl border ${currentFestivalSeason.highlight} space-y-1`}>
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span>{currentFestivalSeason.name}</span>
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10">
            {currentFestivalSeason.period}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {currentFestivalSeason.desc}
        </p>
      </div>

      {/* Date Converter Tool */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <label className="block text-[11px] font-semibold text-slate-300">
          Find Igbo Market Day for Any Date
        </label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
          />
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1.5 whitespace-nowrap">
            <span>{calculatedMarket.symbol}</span>
            <span>{calculatedMarket.name} Day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
