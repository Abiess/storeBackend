# Boutique Sans Inscription Demo (French)

## Créer une boutique online sans inscription

**Durée:** ~30-45 secondes  
**Langue:** Français  
**Public cible:** Utilisateurs francophones (Maroc, France, Belgique, etc.)

---

## 📋 Flow du Demo

### 1. Page d'accueil (5s)
- Afficher la landing page markt.ma
- Scroll pour montrer les features
- Retour au hero section

### 2. Cliquer sur "Créer Shop gratuit" (5s)
- Bouton CTA principal: "🚀 Jetzt kostenlos Shop erstellen"
- Navigation vers le formulaire de création

### 3. Entrer le nom du magasin (5s)
- Input: "z.B. Fatimas Mode Boutique"
- Génération automatique d'un nom unique: `Boutique{timestamp}`

### 4. Sélectionner le type (5s)
- Cliquer sur "🍕 Lebensmittel" (Alimentation)
- Alternatives: Shop, Restaurant, Riad, etc.

### 5. Créer le store (5s)
- Bouton: "🚀 Jetzt Store erstellen"
- Redirection vers dashboard ou success page

### 6. Voir le store (10s)
- Lien: "🌐 Store ansehen ↗" (ouvre nouvel onglet)
- Afficher la storefront publique
- Cliquer sur "Next" si carousel/tutorial visible
- Fermer l'onglet et retourner à la page principale

### 7. Succès! (3s)
- Message de confirmation
- Store créé sans inscription email

---

## 🚀 Lancement

```bash
cd video-automation
npm run demo:boutique
```

**Ou via demo:all:**
```bash
npm run demo:all
```

---

## 🎯 Points clés

✅ **Aucune inscription email requise**  
✅ **Création instantanée de boutique**  
✅ **Sélection du type d'entreprise**  
✅ **Aperçu immédiat de la storefront**  
✅ **Interface en français** (labels Playwright)  
✅ **Durée optimisée** (~30-45 secondes)

---

## 📹 Résultat Vidéo

**Emplacement:**  
`test-results/boutique-sans-inscription-demo-chromium/video.webm`

**Résolution:** 1920x1080  
**FPS:** 30  
**Format:** WebM

---

## 🎨 Features Techniques

- **FlowRecorder:** Indicateurs de step avec gradient violet markt.ma
- **Click Tracking:** Highlights sur les clics
- **Smooth Scrolling:** Animations fluides
- **Popup Handling:** Gestion automatique du nouvel onglet
- **Fallback Logic:** Sélection automatique si business type non trouvé

---

## ⚠️ Important

- **Pas de données réelles:** Utilise uniquement des noms de stores générés automatiquement
- **Pas d'inscription email:** Le flow ne nécessite pas d'email
- **Production-safe:** Aucun impact sur les données client existantes
- **Language Mix:** Labels en français, mais UI peut être en allemand/anglais selon la config

---

## 🔧 Configuration

### ENV Variables (optionnelles)

```bash
# .env.local
BASE_URL=https://markt.ma
# Ou pour dev local:
# BASE_URL=http://localhost:4200
```

### Timing Personnalisé

Si le demo est trop lent ou trop rapide, ajuste les `recorder.pause()` dans le fichier:
- `tests/demo/boutique-sans-inscription.spec.js`

**Timing actuel:**
- Step 1: 1700ms total
- Step 2: 1000ms
- Step 3: 1000ms
- Step 4: 800ms
- Step 5: 1500ms
- Step 6: 2800ms (includes popup handling)
- Step 7: 1000ms

**Total estimé:** ~9.8s (avec pauses) + temps d'interaction = **30-45 secondes**

---

## 📊 Comparaison avec autres demos

| Demo | Durée | Public | Langue | Contenu |
|------|-------|--------|--------|---------|
| Platform | 2-3 min | B2B/Investisseurs | Deutsch/English | Fonctionnalités complètes |
| Mobile | 60-90s | Utilisateurs mobiles | Deutsch | Expérience mobile |
| Quick Start | 30-60s | Nouveaux users | Deutsch | Phone auth |
| **Boutique** | **30-45s** | **Francophones** | **Français** | **Création rapide** |

---

## 🎬 Use Cases

- **Marketing francophone:** Maroc, Algérie, Tunisie, France, Belgique, Suisse
- **Ads Facebook/Instagram:** Région MENA francophone
- **Landing pages:** Version française de markt.ma
- **Tutoriels YouTube:** Chaîne française
- **WhatsApp Business:** Messages promotionnels

---

## 📝 Notes de Traduction

Les **step labels** sont en **français** pour correspondre au nom du test:
- "Page d'accueil"
- "Cliquer sur 'Créer Shop gratuit'"
- "Entrer le nom du magasin"
- "Sélectionner le type (Lebensmittel)"
- "Créer le store"
- "Voir le store (Storefront)"
- "Succès! Store créé"

L'**UI de l'application** peut rester en allemand (production actuelle) ou être traduite en français si disponible.

---

## ✅ Checklist avant Publication

- [ ] Video créé sans erreurs
- [ ] Durée < 45 secondes
- [ ] Storefront s'ouvre correctement
- [ ] Aucune donnée client visible
- [ ] Labels français visibles dans le video
- [ ] Qualité video acceptable (1080p, 30fps)
- [ ] Pas de crashs ou timeouts
- [ ] Popup handling fonctionne

---

## 🚀 Prochaines Étapes

1. **Tester le demo:**
   ```bash
   npm run demo:boutique
   ```

2. **Valider le résultat:**
   - Vérifier le video dans `test-results/`
   - Durée acceptable?
   - Labels bien visibles?

3. **Post-production (optionnel):**
   - Ajouter sous-titres français
   - Musique de fond
   - Branding markt.ma
   - Export MP4 pour réseaux sociaux

4. **Distribution:**
   - Facebook Ads (Maroc, France)
   - Instagram Stories
   - YouTube Shorts
   - WhatsApp Business
   - TikTok (version courte)

---

**Créé le:** 2026-06-28  
**Version:** 1.0.0  
**Status:** ✅ Ready for Production
