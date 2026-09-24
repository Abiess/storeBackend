/**
 * Tier-Klassifikator – stuft Händler nach Produktanzahl ein
 * IGNORED:   < 5 Produkte  → kein Potenzial, wird herausgefiltert
 * BASIC:     5–9 Produkte  → nur Basisdaten
 * PRIORITY: 10–19 Produkte → erhöhte Priorität
 * HOT_LEAD: >= 20 Produkte → vollständige Produktdaten + Bilder
 */
'use strict';
const TIER_IGNORED  = { label: 'IGNORED',  emoji: 'o', minProducts: 0,  maxProducts: 4  };
const TIER_BASIC    = { label: 'BASIC',    emoji: 'B', minProducts: 5,  maxProducts: 9  };
const TIER_PRIORITY = { label: 'PRIORITY', emoji: 'P', minProducts: 10, maxProducts: 19 };
const TIER_HOT_LEAD = { label: 'HOT_LEAD', emoji: 'H', minProducts: 20, maxProducts: Infinity };
const TIERS = { IGNORED: TIER_IGNORED, BASIC: TIER_BASIC, PRIORITY: TIER_PRIORITY, HOT_LEAD: TIER_HOT_LEAD };
function classifyTier(productCount) {
  const count = productCount || 0;
  if (count >= 20) return TIER_HOT_LEAD;
  if (count >= 10) return TIER_PRIORITY;
  if (count >= 5)  return TIER_BASIC;
  return TIER_IGNORED;
}
function applyTier(lead) {
  const tier = classifyTier(lead.productCount);
  lead.tier      = tier.label;
  lead.tierEmoji = tier.emoji;
  return lead;
}
module.exports = { classifyTier, applyTier, TIERS, TIER_IGNORED, TIER_BASIC, TIER_PRIORITY, TIER_HOT_LEAD };
