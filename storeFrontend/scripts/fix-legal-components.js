const fs = require('fs');
const path = require('path');

const legalDir = path.join(__dirname, '..', 'src', 'app', 'features', 'legal');

const components = [
  { file: 'agb-store.component.ts', textField: 'termsAndConditionsText' },
  { file: 'datenschutz-store.component.ts', textField: 'privacyPolicyText' },
  { file: 'impressum-store.component.ts', textField: null }, // uses structured fields
  { file: 'rueckgabe-store.component.ts', textField: 'returnPolicyText' },
  { file: 'versand-store.component.ts', textField: 'shippingPolicyText' }
];

components.forEach((component) => {
  const file = component.file;
  const textField = component.textField;
  const filePath = path.join(legalDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found, skipping`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix: Remove PublicApiService import, add SubdomainService
  content = content.replace(
    /import.*PublicApiService.*from.*'@app\/core\/services\/public-api\.service';?/g,
    ''
  );
  
  content = content.replace(
    /import.*SubdomainService.*from.*'@app\/core\/services\/subdomain\.service';?/g,
    ''
  );
  
  // Add SubdomainService import if not present
  if (!content.includes('SubdomainService')) {
    content = content.replace(
      /(import.*AuthService.*from.*';)/,
      "$1\nimport { SubdomainService } from '@app/core/services/subdomain.service';"
    );
  }
  
  // Fix constructor: Remove publicApi, add subdomainService
  content = content.replace(
    /private publicApi: PublicApiService,?/g,
    ''
  );
  
  if (!content.includes('private subdomainService: SubdomainService')) {
    content = content.replace(
      /(private authService: AuthService,?)/,
      "$1\n    private subdomainService: SubdomainService,"
    );
  }
  
  // Fix ngOnInit: Replace publicApi.getPublicStore().toPromise() with subdomainService.currentStore$
  content = content.replace(
    /const store = await this\.publicApi\.getPublicStore\(\)\.toPromise\(\);/g,
    'this.subdomainService.currentStore$.subscribe(store => {'
  );
  
  content = content.replace(
    /if \(store && store\.storeId\) \{/g,
    'if (store) {'
  );
  
  content = content.replace(
    /this\.storeId = store\.storeId;/g,
    'this.storeId = store.id;'
  );
  
  // Close subscribe block and remove finally
  content = content.replace(
    /\} catch \(error\) \{[\s\S]*?console\.error[\s\S]*?\}\s*finally \{\s*this\.loading = false;\s*\}/g,
    `        this.loading = false;
      });
    } catch (error) {
      console.error('Error loading store:', error);
      this.loading = false;
    }`
  );
  
  // Fix checkOwnership: getCurrentUser().toPromise() -> currentUser()
  content = content.replace(
    /const currentUser = await this\.authService\.getCurrentUser\(\)\.toPromise\(\);/g,
    'const currentUser = this.authService.currentUser();'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed ${file}`);
});

console.log('\n✅ All legal components fixed!');
