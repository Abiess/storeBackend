'use strict';
class SaasFitScorer {
  score(lead) {
    let pts = 0;
    const reasons = [];
    if (lead.productCount >= 50)      { pts += 30; reasons.push('50+ Produkte'); }
    else if (lead.productCount >= 20) { pts += 25; reasons.push('20+ Produkte'); }
    else if (lead.productCount >= 10) { pts += 15; reasons.push('10+ Produkte'); }
    else if (lead.productCount >= 5)  { pts += 5; }
    if (lead.sellerType === 'business') { pts += 20; reasons.push('Business-Konto'); }
    else if (lead.sellerType === 'pro') { pts += 15; reasons.push('Pro-Konto'); }
    if (!lead.hasOwnWebsite) { pts += 20; reasons.push('Kein eigener Shop'); }
    else {
      const url = (lead.websiteUrl || '').toLowerCase();
      if (['instagram.com','facebook.com','wa.me','linktr.ee'].some(d => url.includes(d))) {
        pts += 10; reasons.push('Nur Social-Link als "Shop"');
      }
    }
    if (lead.lastActivity) {
      const days = Math.floor((Date.now() - new Date(lead.lastActivity).getTime()) / 86400000);
      if (days <= 3)       { pts += 15; reasons.push('Zuletzt aktiv <= 3 Tage'); }
      else if (days <= 7)  { pts += 12; reasons.push('Zuletzt aktiv <= 7 Tage'); }
      else if (days <= 30) { pts += 7;  reasons.push('Zuletzt aktiv <= 30 Tage'); }
      else if (days <= 90) { pts += 3; }
    }
    const social = [lead.hasInstagram, lead.hasFacebook, lead.hasWhatsAppBusiness, lead.hasTikTok].filter(Boolean).length;
    if (social >= 3)      { pts += 10; reasons.push('Stark auf Social Media'); }
    else if (social >= 2) { pts += 7;  reasons.push('Mehrere Social-Kanaele'); }
    else if (social >= 1) { pts += 4; }
    if (lead.hasLogo && lead.hasBrandedName) { pts += 5; reasons.push('Professionelles Branding'); }
    else if (lead.hasBrandedName) { pts += 2; }
    if (lead.importReady) { pts += 5; reasons.push('Produktdaten importierbar'); }
    pts = Math.min(100, pts);
    let label, emoji;
    if (pts >= 70)      { label = 'HIGH_FIT';   emoji = 'TOP'; }
    else if (pts >= 45) { label = 'MEDIUM_FIT'; emoji = 'OK'; }
    else if (pts >= 20) { label = 'LOW_FIT';    emoji = 'LOW'; }
    else                { label = 'NO_FIT';     emoji = 'NO'; }
    lead.saasScore  = pts;
    lead.saasLabel  = label;
    lead.saasEmoji  = emoji;
    lead.saasReason = reasons.slice(0, 4).join(' - ');
    return lead;
  }
}
module.exports = SaasFitScorer;
