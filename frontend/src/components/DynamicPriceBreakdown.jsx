import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, Percent, Zap, TrendingUp, ChevronDown, ChevronUp, Gem,
  Layers, Sparkles, CircleDot,
} from 'lucide-react';

const formatINR = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const titleCase = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

/**
 * Price breakdown panel for dynamic products (Haath Phool, Couple Bands, Bridal Sets).
 *
 * Supports TWO response shapes:
 *   V1 (legacy flat) — componentBreakdowns = [ring, bridge, bracelet]
 *   V3 (multi-piece) — componentBreakdowns = [ring, bridge, ring, bridge, medallion, bracelet]
 *                      + groupedBreakdowns = { rings[], bridges[], medallion, bracelet }
 *
 * Rendering is chosen automatically:
 *   - If `configVersion === 3` and `groupedBreakdowns` is present → grouped mode
 *   - Otherwise → flat mode (V1, exactly as before)
 */
const DynamicPriceBreakdown = ({ isOpen, onToggle, priceData }) => {
  if (!priceData || !priceData.componentBreakdowns) return null;

  const {
    componentBreakdowns,
    groupedBreakdowns,
    subtotal,
    discount,
    bundleDiscountPct,
    embeddedTax,
    taxRate,
    total,
    type,
    configVersion,
  } = priceData;

  const isGrouped = configVersion === 3 && !!groupedBreakdowns;

  return (
    <div>
      <button
        onClick={onToggle}
        className="text-xs sm:text-sm text-gold-600 hover:text-gold-700 flex items-center gap-1 font-medium self-start"
      >
        See Price Breakup
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 p-3 sm:p-5 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-card dark:to-dark-bg rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border"
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-gold-600" />
              <h4 className="font-playfair font-bold text-base sm:text-lg text-gray-800 dark:text-white">
                Price Breakdown
              </h4>
            </div>

            {/* Live gold rate banner */}
            {componentBreakdowns[0]?.liveRatePerGram && (
              <div className="mb-4 p-3 bg-gradient-to-r from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/20 rounded-lg border border-gold-200 dark:border-gold-800">
                <div className="flex justify-between items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-medium text-gold-700 dark:text-gold-400 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Live {componentBreakdowns[0].purity} Gold Rate
                  </span>
                  <span className="font-bold text-gold-700 dark:text-gold-400 text-sm sm:text-base whitespace-nowrap">
                    ₹{componentBreakdowns[0].liveRatePerGram}/g
                  </span>
                </div>
                <p className="text-xs text-gold-600 dark:text-gold-500 mt-1">
                  All component weights are priced at this rate
                </p>
              </div>
            )}

            {/* Body — grouped (V3) or flat (V1) */}
            {isGrouped ? (
              <GroupedBody grouped={groupedBreakdowns} />
            ) : (
              <FlatBody pieces={componentBreakdowns} />
            )}

            {/* Bundle discount (only if > 0) */}
            {discount > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-2 border border-green-200 dark:border-green-800">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                    Bundle Discount ({bundleDiscountPct}%)
                  </span>
                  <span className="font-bold text-green-700 dark:text-green-400 text-sm sm:text-base whitespace-nowrap">
                    − {formatINR(discount)}
                  </span>
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="p-3 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Subtotal
                </span>
                <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
                  {formatINR(subtotal)}
                </span>
              </div>
            </div>

            {/* GST (embedded) */}
            <div className="p-3 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-gold-600" />
                  Includes GST ({taxRate}%)
                </span>
                <span className="text-xs sm:text-sm text-gray-500 italic whitespace-nowrap">
                  {formatINR(embeddedTax)}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Already included in the total — not added on top
              </p>
            </div>

            {/* Grand total */}
            <div className="p-3 sm:p-4 bg-gradient-to-r from-gold-500 to-gold-700 rounded-lg mt-3 text-white shadow-md">
              <div className="flex justify-between items-center gap-2">
                <span className="font-bold text-base sm:text-lg">Grand Total</span>
                <span className="font-bold text-xl sm:text-2xl whitespace-nowrap">
                  {formatINR(total)}
                </span>
              </div>
            </div>

            {/* Info footer */}
            <div className="mt-4 p-3 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-200 dark:border-gold-800">
              <p className="text-xs text-gold-700 dark:text-gold-400 text-center">
                <Percent className="h-3 w-3 inline mr-1" />
                Prices calculated live from current gold rate + configuration.
                {type === 'HAATH_PHOOL' && ' Haath Phool components priced individually.'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// FLAT BODY — V1 legacy (one big card per component)
// ============================================================

const FlatBody = ({ pieces }) => (
  <>
    {pieces.map((comp, idx) => (
      <div key={comp.componentKey + idx} className="mb-4 last:mb-2">
        {/* Component name */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.2em] uppercase text-gold-600 font-semibold">
            {String(idx + 1).padStart(2, '0')} · {comp.name}
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
        </div>

        <PieceCard comp={comp} />
      </div>
    ))}
  </>
);

// ============================================================
// PIECE CARD — full expanded card (used by flat mode)
// ============================================================

const PieceCard = ({ comp }) => (
  <>
    {/* Metal row */}
    <div className="p-3 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
      <div className="flex justify-between items-center mb-1 gap-2">
        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">
          Metal ({comp.purity} · {comp.totalChargedWeightGrams.toFixed(2)}g)
        </span>
        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
          {formatINR(comp.metalCost)}
        </span>
      </div>
      <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400">
          <span className="font-medium">Formula:</span>{' '}
          <span className="font-mono">Weight × Rate</span>
        </p>
        <p className="text-gray-600 dark:text-gray-300 font-mono break-all">
          {comp.totalChargedWeightGrams.toFixed(3)}g × ₹{comp.liveRatePerGram}/g
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-[11px]">
          Net {comp.netWeightGrams.toFixed(3)}g − wastage at {comp.wastagePercentage}%
          {comp.stoneWeightGrams > 0 && ` (stones deducted ${comp.stoneWeightGrams.toFixed(3)}g)`}
        </p>
      </div>
    </div>

    {/* Gemstones */}
    {comp.gemstoneCost > 0 && (
      <div className="p-3 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
        <div className="flex justify-between items-center mb-1 gap-2">
          <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Gem className="h-3.5 w-3.5 text-gold-600" />
            Gemstones
          </span>
          <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
            {formatINR(comp.gemstoneCost)}
          </span>
        </div>
        <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs space-y-1">
          {comp.gemstoneBreakdown.map((g, i) => (
            <div key={i} className="flex justify-between gap-2 text-gray-600 dark:text-gray-300">
              <span className="truncate">
                {g.name || g.type} ({g.carats}ct)
              </span>
              <span className="font-mono whitespace-nowrap">
                {formatINR(g.lineTotal)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Making charges */}
    <div className="p-3 bg-white dark:bg-dark-bg rounded-lg mb-2 shadow-sm">
      <div className="flex justify-between items-center mb-1 gap-2">
        <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <Zap className="h-3.5 w-3.5 text-gold-600" />
          Making Charges
        </span>
        <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
          {formatINR(comp.laborCost)}
        </span>
      </div>
      <div className="p-2 bg-gray-50 dark:bg-dark-card rounded text-xs">
        <p className="text-gray-500 dark:text-gray-400 font-mono">
          {comp.makingChargeType === 'PER_GRAM' &&
            `Net weight × ₹${comp.makingChargeValue}/g`}
          {comp.makingChargeType === 'FLAT' &&
            `Flat fee ₹${comp.makingChargeValue}`}
          {comp.makingChargeType === 'PERCENTAGE' &&
            `${comp.makingChargeValue}% of metal cost`}
        </p>
      </div>
    </div>

    {/* Component subtotal */}
    <div className="p-3 bg-gold-50 dark:bg-gold-900/20 rounded-lg border border-gold-200 dark:border-gold-800">
      <div className="flex justify-between items-center gap-2">
        <span className="text-xs font-semibold text-gold-700 dark:text-gold-400">
          {comp.name} Subtotal
        </span>
        <span className="font-bold text-gold-700 dark:text-gold-400 text-sm sm:text-base whitespace-nowrap">
          {formatINR(comp.componentTotal)}
        </span>
      </div>
    </div>
  </>
);

// ============================================================
// GROUPED BODY — V3 multi-piece (compact sections)
// ============================================================

const GroupedBody = ({ grouped }) => {
  const { rings = [], bridges = [], medallion, bracelet } = grouped || {};

  return (
    <>
      {rings.length > 0 && (
        <Section
          title="Rings"
          icon={<CircleDot className="h-3.5 w-3.5" />}
          count={rings.length}
        >
          {rings.map((r, i) => (
            <PieceRow
              key={`ring-${r.finger || i}`}
              index={String(i + 1).padStart(2, '0')}
              name={`Ring — ${titleCase(r.finger)}`}
              subtitle={`${r.grossWeightGrams.toFixed(3)}g · ${r.purity}`}
              amount={r.componentTotal}
            />
          ))}
        </Section>
      )}

      {bridges.length > 0 && (
        <Section
          title="Bridges"
          icon={<Layers className="h-3.5 w-3.5" />}
          count={bridges.length}
        >
          {bridges.map((b, i) => (
            <PieceRow
              key={`bridge-${b.finger || i}`}
              index={String(i + 1).padStart(2, '0')}
              name={`Bridge — ${titleCase(b.finger)}`}
              subtitle={`${b.grossWeightGrams.toFixed(3)}g · ${b.purity}`}
              amount={b.componentTotal}
            />
          ))}
        </Section>
      )}

      {medallion && (
        <Section
          title="Medallion"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          count={1}
        >
          <PieceRow
            index="01"
            name={medallion.name || 'Medallion'}
            subtitle={`${medallion.grossWeightGrams.toFixed(3)}g · ${medallion.purity}${
              medallion.styleKey ? ` · ${titleCase(medallion.styleKey)}` : ''
            }`}
            amount={medallion.componentTotal}
          />
        </Section>
      )}

      {bracelet && (
        <Section title="Bracelet" icon={<Gem className="h-3.5 w-3.5" />} count={1}>
          <PieceRow
            index="01"
            name={bracelet.name || 'Bracelet'}
            subtitle={`${bracelet.grossWeightGrams.toFixed(3)}g · ${bracelet.purity}`}
            amount={bracelet.componentTotal}
          />
        </Section>
      )}
    </>
  );
};

// ============================================================
// SECTION WRAPPER
// ============================================================

const Section = ({ title, icon, count, children }) => (
  <div className="mb-4 last:mb-2">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-gold-600">{icon}</span>
      <span className="text-[10px] tracking-[0.2em] uppercase text-gold-600 font-semibold">
        {title}
        {count > 1 ? ` (${count})` : ''}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-dark-border" />
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

// ============================================================
// PIECE ROW — compact row (used in grouped mode)
// ============================================================

const PieceRow = ({ index, name, subtitle, amount }) => (
  <div className="p-3 bg-white dark:bg-dark-bg rounded-lg shadow-sm">
    <div className="flex justify-between items-center gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-white truncate">
          <span className="text-gold-600 text-[10px] tracking-wider mr-1.5">
            {index}
          </span>
          {name}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {subtitle}
        </p>
      </div>
      <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base whitespace-nowrap">
        {formatINR(amount)}
      </span>
    </div>
  </div>
);

export default DynamicPriceBreakdown;