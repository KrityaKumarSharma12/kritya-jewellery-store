import React from 'react';
import { Info, CircleDot, Sparkles, Gem } from 'lucide-react';

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

const FINGER_LABELS = {
  thumb: 'Thumb',
  index: 'Index',
  middle: 'Middle',
  ring: 'Ring',
  pinky: 'Pinky',
};

const KARATS = [18, 22];

/**
 * Multi-piece configurator for Haath Phool.
 *
 * Emits a v3 configuration:
 *   {
 *     version: 3,
 *     hand: 'right',
 *     rings: [{ finger, size, karat }, ...],
 *     medallion: { enabled, styleKey },
 *     bracelet: { size }
 *   }
 *
 * All options come from the backend via the `dynamicConfig` prop.
 */
const HaathPhoolConfigurator = ({ config, onChange, dynamicConfig }) => {
  const sizingOptions = dynamicConfig?.sizingOptions || {};
  const components = dynamicConfig?.components || [];
  const meta = dynamicConfig?.dynamicProduct || {};

  const maxRings = meta.maxRings ?? 5;
  const maxMedallions = meta.maxMedallions ?? 1;

  // Available medallion variants (multiple rows with same componentKey)
  const medallionVariants = components.filter(
    (c) => c.componentKey === 'medallion'
  );

  const ringOptions = sizingOptions.ring || [];
  const braceletOptions = sizingOptions.bracelet || [];

  const rings = config.rings || [];
  const medallion = config.medallion || { enabled: false, styleKey: 'lotus' };
  const bracelet = config.bracelet || {
    size: braceletOptions[0]?.value || '',
  };

  // ------- Mutators -------
  const toggleFinger = (finger) => {
    const existing = rings.find((r) => r.finger === finger);
    if (existing) {
      onChange({
        ...config,
        rings: rings.filter((r) => r.finger !== finger),
      });
    } else {
      if (rings.length >= maxRings) return;
      const defaultSize =
        ringOptions.find((o) => o.isDefault)?.value ||
        ringOptions[0]?.value ||
        '';
      onChange({
        ...config,
        rings: [...rings, { finger, size: defaultSize, karat: 22 }],
      });
    }
  };

  const updateRing = (finger, patch) => {
    onChange({
      ...config,
      rings: rings.map((r) => (r.finger === finger ? { ...r, ...patch } : r)),
    });
  };

  const setMedallion = (patch) => {
    onChange({ ...config, medallion: { ...medallion, ...patch } });
  };

  const setBracelet = (patch) => {
    onChange({ ...config, bracelet: { ...bracelet, ...patch } });
  };

  // Is the "middle" finger ring enabled? Medallion requires it.
  const middleEnabled = rings.some((r) => r.finger === 'middle');

  return (
    <div className="space-y-6">
      {/* ============== 1. RINGS ============== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CircleDot className="h-4 w-4 text-gold-600" />
          <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">
            1. CHOOSE YOUR RINGS
          </span>
          <Info className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-[11px] text-gray-400 ml-auto">
            {rings.length} / {maxRings}
          </span>
        </div>

        <div className="space-y-2">
          {FINGERS.map((finger) => {
            const ring = rings.find((r) => r.finger === finger);
            const enabled = !!ring;
            const disableToggle = !enabled && rings.length >= maxRings;

            return (
              <div
                key={finger}
                className={`p-3 rounded-lg border transition ${
                  enabled
                    ? 'border-gold-300 bg-gold-50/50 dark:bg-gold-900/10 dark:border-gold-800'
                    : 'border-gray-200 dark:border-dark-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={disableToggle}
                    onChange={() => toggleFinger(finger)}
                    className="h-4 w-4 rounded border-gray-300 text-gold-600 focus:ring-gold-500 disabled:opacity-40"
                  />
                  <span
                    className={`text-sm font-medium ${
                      enabled
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {FINGER_LABELS[finger]}
                  </span>

                  {enabled && (
                    <div className="flex gap-2 ml-auto flex-wrap">
                      <select
                        value={ring.size}
                        onChange={(e) =>
                          updateRing(finger, { size: e.target.value })
                        }
                        className="px-2.5 py-1.5 border border-gray-300 dark:border-dark-border rounded-md text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                      >
                        {ringOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={ring.karat}
                        onChange={(e) =>
                          updateRing(finger, { karat: Number(e.target.value) })
                        }
                        className="px-2.5 py-1.5 border border-gray-300 dark:border-dark-border rounded-md text-xs bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                      >
                        {KARATS.map((k) => (
                          <option key={k} value={k}>
                            {k}K
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-gray-500 mt-2">
          <Info className="h-3 w-3 inline mr-1" />
          Each ring has its own chain that connects to the bracelet.
        </p>
      </div>

      {/* ============== 2. MEDALLION ============== */}
      {maxMedallions > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-gold-600" />
            <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">
              2. MEDALLION
            </span>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </div>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border transition ${
              middleEnabled
                ? 'border-gray-200 dark:border-dark-border cursor-pointer'
                : 'border-gray-200 dark:border-dark-border opacity-60 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              checked={!!medallion.enabled}
              disabled={!middleEnabled}
              onChange={(e) => setMedallion({ enabled: e.target.checked })}
              className="h-4 w-4 mt-0.5 rounded border-gray-300 text-gold-600 focus:ring-gold-500 disabled:opacity-40"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                Add a medallion
                <span className="ml-2 text-gray-400 font-normal text-xs">
                  (attached to the middle finger's chain)
                </span>
              </p>
              {!middleEnabled && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Enable a Middle finger ring to add a medallion.
                </p>
              )}
            </div>
          </label>

          {medallion.enabled && middleEnabled && medallionVariants.length > 0 && (
            <div className="mt-2">
              <select
                value={medallion.styleKey || 'lotus'}
                onChange={(e) => setMedallion({ styleKey: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              >
                {medallionVariants.map((v) => (
                  <option key={v.styleKey} value={v.styleKey}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ============== 3. BRACELET ============== */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gem className="h-4 w-4 text-gold-600" />
          <span className="font-semibold text-gray-800 dark:text-white text-xs sm:text-sm">
            3. BRACELET
          </span>
          <Info className="h-3.5 w-3.5 text-gray-400" />
        </div>
        <select
          value={bracelet.size || ''}
          onChange={(e) => setBracelet({ size: e.target.value })}
          className="w-full px-3 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg text-sm bg-white dark:bg-dark-card text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
        >
          {braceletOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default HaathPhoolConfigurator;