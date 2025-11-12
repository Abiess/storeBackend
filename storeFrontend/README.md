# markt.ma Frontend

Angular-basiertes Frontend für die Multi-Tenant E-Commerce SaaS-Plattform **markt.ma**.

## 🚀 Projektübersicht

Dieses Frontend konsumiert das Spring Boot Backend und bietet eine vollständige Verwaltungsoberfläche für Store-Besitzer.

### Features

- ✅ **Authentifizierung**: Login & Registrierung mit JWT
- ✅ **Store-Verwaltung**: Erstellen und verwalten Sie mehrere Stores
- ✅ **Produkt-Management**: Produkte, Varianten, Kategorien und Medien
- ✅ **Bestellverwaltung**: Übersicht und Statusverwaltung von Bestellungen
- ✅ **Domain-Verwaltung**: Subdomains und Custom Domains
- ✅ **Responsive Design**: Optimiert für Desktop und Mobile
- ✅ **Mock-Modus**: Entwickeln Sie am UI **ohne laufendes Backend**! 🎯

## 🎯 Schnellstart mit Mock-Daten (empfohlen für UI-Entwicklung!)

```bash
cd storeFrontend
npm install
npm start
```

Öffnen Sie http://localhost:4200 und melden Sie sich mit **beliebigen** Zugangsdaten an:
```
Email: demo@markt.ma
Passwort: test123
```

**Kein Backend erforderlich!** Siehe [MOCK_MODE.md](./MOCK_MODE.md) für Details.

### Mock-Modus vs. Echtes Backend

Der Mock-Modus ist **standardmäßig aktiviert** in `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  useMockData: true,  // 👈 true = Mock-Daten, false = Echtes Backend
  apiUrl: 'http://localhost:8080/api',
  publicApiUrl: 'http://localhost:8080/api/public'
};
```

**Einfach umschalten:**
- `useMockData: true` → Arbeiten ohne Backend (perfekt für UI-Entwicklung)
- `useMockData: false` → Echte API-Calls zum Backend

📖 **Vollständige Anleitung:** [MOCK_MODE.md](./MOCK_MODE.md)

## 📋 Voraussetzungen

- Node.js **14.x** oder höher
- npm **6.x** oder höher
- Ein moderner Webbrowser (z. B. Chrome, Firefox, Edge)

