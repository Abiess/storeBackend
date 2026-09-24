import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, CheckCircle, AlertCircle, Loader } from 'lucide-react';

/**
 * Phone Verification Component für Cash on Delivery
 *
 * Features:
 * - WhatsApp/SMS Fallback
 * - Countdown Timer
 * - Max 3 Versuche
 * - Mobile-optimiert
 * - Klare Fehlermeldungen
 *
 * Props:
 * - onVerified: (verificationId) => void - Callback bei erfolgreicher Verifizierung
 * - storeId: number - Store ID für die Bestellung
 */
export default function PhoneVerificationComponent({ onVerified, storeId }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'code' | 'verified'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [remainingTime, setRemainingTime] = useState(0);
  const [channel, setChannel] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  // Countdown Timer
  useEffect(() => {
    if (remainingTime > 0) {
      const timer = setTimeout(() => setRemainingTime(remainingTime - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [remainingTime]);

  // Code senden
  const handleSendCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/public/phone-verification/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          storeId: storeId.toString()
        })
      });

      const data = await response.json();

      if (data.success) {
        setVerificationId(data.verificationId);
        setChannel(data.channel);
        setStep('code');
        setRemainingTime(60); // 60 Sekunden bis neuer Code angefordert werden kann
        setRemainingAttempts(data.remainingAttempts || 3);
        setSuccessMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Fehler beim Senden des Codes. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Code verifizieren
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/public/phone-verification/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: verificationId,
          code: code
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('verified');
        setSuccessMessage('✅ Telefonnummer erfolgreich verifiziert!');
        onVerified(verificationId);
      } else {
        setError(data.message);
        setRemainingAttempts(prev => prev - 1);
        setCode(''); // Code-Feld leeren
      }
    } catch (err) {
      setError('Fehler bei der Verifizierung. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  // Telefonnummer formatieren (während Eingabe)
  const formatPhoneNumber = (value) => {
    // Nur Ziffern und + erlauben
    let cleaned = value.replace(/[^\d+]/g, '');

    // Sicherstellen, dass + am Anfang steht
    if (cleaned && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  };

  // Zurück zur Telefoneingabe
  const handleBackToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
          <Phone className="w-6 h-6 text-yellow-900" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            Telefonnummer-Verifizierung
          </h3>
          <p className="text-sm text-gray-600">
            Erforderlich für Nachnahme-Bestellungen
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && !error && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Step 1: Telefonnummer eingeben */}
      {step === 'phone' && (
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Telefonnummer (mit Ländervorwahl)
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="+49 123 4567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg"
                disabled={loading}
              />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Format: +49 (Deutschland), +43 (Österreich), +41 (Schweiz)
            </p>
          </div>

          <button
            onClick={handleSendCode}
            disabled={loading || phoneNumber.length < 8}
            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" />
                Code per WhatsApp/SMS senden
              </>
            )}
          </button>

          <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
            <p>
              Sie erhalten einen 6-stelligen Code per WhatsApp oder SMS.
              Der Code ist 10 Minuten gültig und Sie haben 3 Versuche zur Eingabe.
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Code eingeben */}
      {step === 'code' && (
        <div className="space-y-4">
          {channel && (
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600">
                Code wurde per <span className="font-semibold text-yellow-700">
                  {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                </span> an
              </p>
              <p className="font-mono text-lg font-bold text-gray-900 mt-1">
                {phoneNumber}
              </p>
            </div>
          )}

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 text-center">
              Verifizierungscode
            </label>
            <input
              type="text"
              placeholder="123456"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-center text-3xl font-mono tracking-widest"
              disabled={loading}
              autoFocus
            />
            <p className="mt-2 text-sm text-center text-gray-600">
              Noch {remainingAttempts} Versuch{remainingAttempts !== 1 ? 'e' : ''} übrig
            </p>
          </div>

          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length !== 6}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Wird überprüft...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Code verifizieren
              </>
            )}
          </button>

          {/* Neuen Code anfordern */}
          <div className="text-center">
            {remainingTime > 0 ? (
              <p className="text-sm text-gray-600">
                Neuen Code in <span className="font-semibold text-yellow-700">{remainingTime}s</span> anfordern
              </p>
            ) : (
              <button
                onClick={handleBackToPhone}
                className="text-sm text-blue-600 hover:underline font-medium"
              >
                Neuen Code anfordern
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Erfolgreich verifiziert */}
      {step === 'verified' && (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">
            Erfolgreich verifiziert!
          </h4>
          <p className="text-gray-600">
            Sie können nun Ihre Bestellung abschließen.
          </p>
        </div>
      )}
    </div>
  );
}
