
---

**Status**: ✅ Backend vollständig implementiert, Frontend-Integration ausstehend
# Cash on Delivery (COD) Phone Verification - Implementierungs-Dokumentation

## 📋 Übersicht

Dieses Feature implementiert eine Telefonnummer-Verifizierung für "Cash on Delivery" (Nachnahme) Bestellungen, um Fake-Bestellungen und unnötige Retouren zu reduzieren.

## ✨ Features

### Backend
- ✅ **PaymentMethod Enum** erweitert um `CASH_ON_DELIVERY`
- ✅ **Order Entity** erweitert um:
  - `paymentMethod` - Zahlungsmethode
  - `phoneVerificationId` - Referenz zur Verifizierung
  - `phoneVerified` - Status der Verifizierung
- ✅ **Phone Verification API** mit drei Endpunkten:
  - `POST /api/public/phone-verification/send-code` - Code senden
  - `POST /api/public/phone-verification/verify-code` - Code verifizieren
  - `GET /api/public/phone-verification/status/{id}` - Status prüfen
- ✅ **WhatsApp + SMS Fallback** automatisch
- ✅ **Rate Limiting** (1 Code pro Minute)
- ✅ **Security Features**:
  - 6-stelliger numerischer Code
  - 10 Minuten Gültigkeit
  - Max. 3 Versuche pro Code
  - Automatische Bereinigung alter Codes

### Frontend Integration (zu implementieren)

#### 1. Checkout Flow Anpassung

```javascript
// Beispiel: CheckoutPage.jsx

const [paymentMethod, setPaymentMethod] = useState(null);
const [phoneVerification, setPhoneVerification] = useState({
  required: false,
  verificationId: null,
  verified: false,
  phoneNumber: ''
});

// Wenn Cash on Delivery ausgewählt wird
const handlePaymentMethodChange = (method) => {
  setPaymentMethod(method);
  
  if (method === 'CASH_ON_DELIVERY') {
    setPhoneVerification(prev => ({ ...prev, required: true }));
  } else {
    setPhoneVerification({ required: false, verificationId: null, verified: false, phoneNumber: '' });
  }
};

// Code anfordern
const requestVerificationCode = async (phoneNumber) => {
  try {
    const response = await fetch('/api/public/phone-verification/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phoneNumber: phoneNumber, // Format: +491234567890
        storeId: storeId.toString()
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setPhoneVerification(prev => ({
        ...prev,
        verificationId: data.verificationId,
        phoneNumber: phoneNumber
      }));
      
      toast.success(`Code wurde per ${data.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} gesendet`);
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error('Fehler beim Senden des Codes');
  }
};

// Code verifizieren
const verifyCode = async (code) => {
  try {
    const response = await fetch('/api/public/phone-verification/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationId: phoneVerification.verificationId,
        code: code
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      setPhoneVerification(prev => ({ ...prev, verified: true }));
      toast.success('✅ Telefonnummer erfolgreich verifiziert');
    } else {
      toast.error(data.message);
    }
  } catch (error) {
    toast.error('Fehler bei der Verifizierung');
  }
};

// Checkout durchführen
const handleCheckout = async () => {
  // Validierung
  if (paymentMethod === 'CASH_ON_DELIVERY' && !phoneVerification.verified) {
    toast.error('Bitte verifizieren Sie Ihre Telefonnummer');
    return;
  }
  
  const checkoutData = {
    storeId,
    customerEmail,
    shippingAddress,
    billingAddress,
    notes,
    paymentMethod,
    phoneVerificationId: phoneVerification.verificationId, // Nur bei COD
    sessionId // für Guest Checkout
  };
  
  const response = await fetch('/api/public/orders/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutData)
  });
  
  const data = await response.json();
  
  if (response.ok) {
    router.push(`/order-confirmation/${data.orderNumber}`);
  } else {
    if (data.requiresPhoneVerification) {
      toast.error('Telefonnummer-Verifizierung erforderlich');
    } else {
      toast.error(data.error);
    }
  }
};
```

#### 2. UI Component: PhoneVerification.jsx

```jsx
import React, { useState } from 'react';

export default function PhoneVerification({ onVerified }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  const handleSendCode = async () => {
    setLoading(true);
    // ... API Call
    setStep('code');
    setRemainingTime(60); // Countdown für erneutes Senden
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    // ... API Call
    if (success) {
      onVerified(verificationId);
    }
    setLoading(false);
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        📱 Telefonnummer-Verifizierung
        <span className="ml-2 text-sm text-gray-600">(erforderlich für Nachnahme)</span>
      </h3>
      
      {step === 'phone' ? (
        <div>
          <label className="block mb-2 text-sm font-medium">
            Telefonnummer (mit Ländervorwahl)
          </label>
          <input
            type="tel"
            placeholder="+49 123 4567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            onClick={handleSendCode}
            disabled={loading || !phoneNumber}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Wird gesendet...' : 'Code per WhatsApp/SMS senden'}
          </button>
          <p className="text-xs text-gray-600 mt-2">
            Sie erhalten einen 6-stelligen Code per WhatsApp oder SMS
          </p>
        </div>
      ) : (
        <div>
          <label className="block mb-2 text-sm font-medium">
            Verifizierungscode
          </label>
          <input
            type="text"
            placeholder="123456"
            maxLength="6"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-2 border rounded-lg mb-4 text-center text-2xl tracking-wider"
          />
          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Wird überprüft...' : 'Code verifizieren'}
          </button>
          {remainingTime > 0 ? (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Neuen Code in {remainingTime}s anfordern
            </p>
          ) : (
            <button
              onClick={() => setStep('phone')}
              className="w-full text-blue-600 mt-2 text-sm hover:underline"
            >
              Neuen Code anfordern
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

## 🚀 Installation & Setup

### 1. Datenbank Migration

```bash
# PostgreSQL
psql -U your_user -d your_database -f scripts/add-cod-phone-verification.sql

# Oder mit Flyway/Liquibase in production
```

### 2. Backend Starten

```bash
mvn clean install
mvn spring-boot:run
```

### 3. Environment Variables prüfen

Stelle sicher, dass Twilio konfiguriert ist (siehe `application.properties`):

```properties
# Twilio Configuration (optional, falls noch nicht vorhanden)
twilio.account-sid=YOUR_ACCOUNT_SID
twilio.auth-token=YOUR_AUTH_TOKEN
twilio.phone-number=YOUR_TWILIO_NUMBER
twilio.whatsapp-number=whatsapp:+14155238886

# Verification Settings
verification.code.expiry-minutes=10
verification.max-attempts=3
verification.rate-limit-minutes=1
```

## 📡 API Endpunkte

### 1. Code anfordern
```http
POST /api/public/phone-verification/send-code
Content-Type: application/json

{
  "phoneNumber": "+491234567890",
  "storeId": "1"
}

Response:
{
  "success": true,
  "verificationId": 123,
  "channel": "whatsapp",
  "message": "Code per WhatsApp gesendet. Gültig für 10 Minuten.",
  "expiresInMinutes": 10,
  "remainingAttempts": 3
}
```

### 2. Code verifizieren
```http
POST /api/public/phone-verification/verify-code
Content-Type: application/json

{
  "verificationId": 123,
  "code": "123456"
}

Response:
{
  "success": true,
  "verificationId": 123,
  "channel": "whatsapp",
  "message": "Telefonnummer erfolgreich verifiziert"
}
```

### 3. Checkout mit COD
```http
POST /api/public/orders/checkout
Content-Type: application/json

{
  "storeId": 1,
  "customerEmail": "kunde@example.com",
  "paymentMethod": "CASH_ON_DELIVERY",
  "phoneVerificationId": 123,
  "shippingAddress": { ... },
  "billingAddress": { ... },
  "sessionId": "guest-session-123"
}
```

## 🔒 Security Features

1. **Rate Limiting**: 1 Code pro Minute pro Nummer
2. **Expiration**: Codes sind 10 Minuten gültig
3. **Max Attempts**: Maximal 3 Versuche pro Code
4. **Auto Cleanup**: Alte Verifizierungen werden automatisch gelöscht
5. **E.164 Format**: Telefonnummern müssen im internationalen Format sein

## 🎨 UX Best Practices

1. **Progressive Disclosure**: Verifizierung nur bei COD zeigen
2. **Clear Messaging**: Klare Anweisungen und Fehlermeldungen
3. **Visual Feedback**: Loading States und Success/Error Indicators
4. **Mobile First**: Optimiert für mobile Geräte
5. **Accessibility**: Screenreader-freundlich

## 🧪 Testing

### Backend Tests (TODO)
```java
// PhoneVerificationServiceTest.java
// PhoneVerificationControllerTest.java
```

### Frontend Tests (TODO)
```javascript
// PhoneVerification.test.jsx
// CheckoutFlow.test.jsx
```

## 📊 Monitoring

- Logs überprüfen: `check-logs.ps1`
- Metriken in Grafana: Phone Verification Success Rate
- Fehlerrate überwachen: Failed verification attempts

## 🔄 Zukünftige Erweiterungen

- [ ] Telegram Bot Integration
- [ ] Voice Call Fallback
- [ ] Multi-Language Support
- [ ] Custom SMS Templates per Store
- [ ] Analytics Dashboard für Store-Betreiber
- [ ] Blacklist für missbrauchte Nummern

## 📚 Weitere Ressourcen

- [Twilio WhatsApp API Docs](https://www.twilio.com/docs/whatsapp)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [GDPR Compliance für Phone Numbers](https://gdpr.eu/)

