const d  = require('./debug-profile-nextdata.json');
const cp = d.props.pageProps.componentProps;
console.log('componentProps Keys:', Object.keys(cp));
console.log('Ads im Profil:', cp.ads && cp.ads.ads ? cp.ads.ads.length : 'none');
// Alle Keys durchsuchen die Seller-Info enthalten könnten
for (const [k, v] of Object.entries(cp)) {
  if (k !== 'ads' && k !== 'filters' && k !== 'dehydratedState' && k !== 'features' && k !== 'popularKeywords') {
    console.log(`\n--- cp.${k} ---`);
    console.log(JSON.stringify(v, null, 2).slice(0, 800));
  }
}

