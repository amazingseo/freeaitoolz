import { useState, useMemo } from 'react';

export default function SaasGhostCalculator() {
  const [totalSeats, setTotalSeats] = useState(50);
  const [activePercent, setActivePercent] = useState(65);
  const [pricePerSeat, setPricePerSeat] = useState(25);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [apiCalls, setApiCalls] = useState(100000);
  const [apiCostPer1k, setApiCostPer1k] = useState(0.5);
  const [activeApiPercent, setActiveApiPercent] = useState(40);

  const stats = useMemo(() => {
    const ghostSeats = Math.round(totalSeats * (1 - activePercent / 100));
    const activeSeats = totalSeats - ghostSeats;
    const monthlyTotal = totalSeats * pricePerSeat;
    const ghostCostMonthly = ghostSeats * pricePerSeat;
    const ghostCostAnnual = ghostCostMonthly * 12;
    const activeRevPerSeat = monthlyTotal > 0 ? monthlyTotal / activeSeats : 0;
    
    const wastedApiCalls = Math.round(apiCalls * (1 - activeApiPercent / 100));
    const wastedApiCost = (wastedApiCalls / 1000) * apiCostPer1k;
    const totalApiCost = (apiCalls / 1000) * apiCostPer1k;
    
    const totalWasteMonthly = ghostCostMonthly + wastedApiCost;
    const totalWasteAnnual = totalWasteMonthly * 12;
    const savingsPercent = monthlyTotal > 0 ? Math.round((totalWasteMonthly / (monthlyTotal + totalApiCost)) * 100) : 0;
    
    const burnRate = monthlyTotal + totalApiCost;
    const optimizedBurn = burnRate - totalWasteMonthly;
    const runwayExtension = burnRate > 0 ? Math.round((totalWasteAnnual / burnRate)) : 0;

    return { ghostSeats, activeSeats, monthlyTotal, ghostCostMonthly, ghostCostAnnual, activeRevPerSeat, wastedApiCalls, wastedApiCost, totalWasteMonthly, totalWasteAnnual, savingsPercent, burnRate, optimizedBurn, runwayExtension };
  }, [totalSeats, activePercent, pricePerSeat, billingCycle, apiCalls, apiCostPer1k, activeApiPercent]);

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  const fmtFull = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-5 bg-gray-50 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><span>👥</span> Seat Usage</h3>
          <div>
            <label className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Total Seats</span><span className="text-blue-600">{totalSeats}</span></label>
            <input type="range" min={1} max={500} value={totalSeats} onChange={e => setTotalSeats(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full accent-blue-600" />
          </div>
          <div>
            <label className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Active Users</span><span className="text-blue-600">{activePercent}%</span></label>
            <input type="range" min={0} max={100} value={activePercent} onChange={e => setActivePercent(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full accent-blue-600" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Price Per Seat / Month</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-bold">$</span>
              <input type="number" min={0} value={pricePerSeat} onChange={e => setPricePerSeat(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="space-y-5 bg-gray-50 rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><span>⚡</span> API / Infrastructure</h3>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Monthly API Calls</label>
            <input type="number" min={0} value={apiCalls} onChange={e => setApiCalls(parseInt(e.target.value) || 0)}
              className="w-full p-2.5 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Cost per 1K API Calls ($)</label>
            <input type="number" min={0} step={0.01} value={apiCostPer1k} onChange={e => setApiCostPer1k(parseFloat(e.target.value) || 0)}
              className="w-full p-2.5 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="flex justify-between text-sm font-bold text-gray-700 mb-2"><span>Productive API Usage</span><span className="text-blue-600">{activeApiPercent}%</span></label>
            <input type="range" min={0} max={100} value={activeApiPercent} onChange={e => setActiveApiPercent(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-full accent-blue-600" />
          </div>
        </div>
      </div>

      {/* Results Dashboard */}
      <div className="space-y-4">
        {/* Headline Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
            <p className="text-2xl sm:text-3xl font-extrabold text-red-700">{fmtFull(stats.totalWasteMonthly)}</p>
            <p className="text-xs font-bold text-red-600 mt-1">Monthly Waste</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
            <p className="text-2xl sm:text-3xl font-extrabold text-red-700">{fmtFull(stats.totalWasteAnnual)}</p>
            <p className="text-xs font-bold text-red-600 mt-1">Annual Waste</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{stats.ghostSeats}</p>
            <p className="text-xs font-bold text-amber-600 mt-1">Ghost Seats</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-200">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{stats.savingsPercent}%</p>
            <p className="text-xs font-bold text-emerald-600 mt-1">Potential Savings</p>
          </div>
        </div>

        {/* Burn Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h4 className="font-bold text-gray-900 mb-4">Monthly Burn Rate Comparison</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-600">Current Burn</span><span className="font-bold text-red-600">{fmtFull(stats.burnRate)}/mo</span></div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-600">Optimized Burn</span><span className="font-bold text-emerald-600">{fmtFull(stats.optimizedBurn)}/mo</span></div>
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.burnRate > 0 ? (stats.optimizedBurn / stats.burnRate) * 100 : 0}%` }} /></div>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">By eliminating ghost seats and reducing wasted API calls, you could extend your runway by <strong className="text-emerald-700">{stats.runwayExtension} months</strong>.</p>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3">👥 Seat Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Active seats</span><span className="font-bold text-emerald-700">{stats.activeSeats}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ghost seats</span><span className="font-bold text-red-700">{stats.ghostSeats}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ghost seat cost</span><span className="font-bold text-red-700">{fmtFull(stats.ghostCostMonthly)}/mo</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Effective cost/active user</span><span className="font-bold">${stats.activeRevPerSeat.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-gray-700 mb-3">⚡ API Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Total API calls</span><span className="font-bold">{apiCalls.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Wasted calls</span><span className="font-bold text-red-700">{stats.wastedApiCalls.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Wasted API cost</span><span className="font-bold text-red-700">${stats.wastedApiCost.toFixed(2)}/mo</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
