// Erweiterte Checkout-Komponente mit allen Verbesserungen
// Diese Datei zeigt die zusätzlichen Properties und Methoden

export class CheckoutComponentEnhanced {
  // Bestehende Properties bleiben...

  // NEUE: Für verbesserte Phone Input
  countryCodes = [
    { code: 'DE', dialCode: '+49', flag: '🇩🇪', name: 'Deutschland' },
    { code: 'AT', dialCode: '+43', flag: '🇦🇹', name: 'Österreich' },
    { code: 'CH', dialCode: '+41', flag: '🇨🇭', name: 'Schweiz' },
    { code: 'US', dialCode: '+1', flag: '🇺🇸', name: 'USA' },
    { code: 'GB', dialCode: '+44', flag: '🇬🇧', name: 'UK' },
    { code: 'FR', dialCode: '+33', flag: '🇫🇷', name: 'Frankreich' },
    { code: 'IT', dialCode: '+39', flag: '🇮🇹', name: 'Italien' },
    { code: 'ES', dialCode: '+34', flag: '🇪🇸', name: 'Spanien' },
    { code: 'NL', dialCode: '+31', flag: '🇳🇱', name: 'Niederlande' },
    { code: 'PL', dialCode: '+48', flag: '🇵🇱', name: 'Polen' }
  ];

  selectedCountry = this.countryCodes[0]; // Deutschland als Default
  phoneNumberLocal = ''; // Nur die Nummer ohne Vorwahl
  phoneValidationError = '';
  isPhoneValid = false;

  /**
   * Validiert die Telefonnummer mit libphonenumber-js
   */
  validatePhoneNumber(): void {
    this.phoneValidationError = '';
    this.isPhoneValid = false;

    if (!this.phoneNumberLocal) {
      return;
    }

    try {
      // Entferne alle Leerzeichen und kombiniere mit Vorwahl
      const fullNumber = this.selectedCountry.dialCode +
                         this.phoneNumberLocal.replace(/\s/g, '');

      const phoneNumber = parsePhoneNumber(fullNumber, this.selectedCountry.code as CountryCode);

      if (phoneNumber && phoneNumber.isValid()) {
        this.isPhoneValid = true;
        this.phoneNumber = phoneNumber.format('E.164'); // z.B. +491234567890
        console.log('✅ Gültige Telefonnummer:', this.phoneNumber);
      } else {
        this.phoneValidationError = 'Ungültige Telefonnummer für ' + this.selectedCountry.name;
      }
    } catch (error) {
      this.phoneValidationError = 'Ungültiges Format. Bitte nur Zahlen eingeben.';
      console.error('Phone validation error:', error);
    }
  }

  /**
   * Prüft ob Phone Verification gerade läuft
   */
  get phoneVerificationInProgress(): boolean {
    return this.selectedPaymentMethod === 'CASH_ON_DELIVERY' &&
           (this.phoneVerificationSent || this.sendingCode) &&
           !this.phoneVerified;
  }

  /**
   * Auto-Format während der Eingabe (optional)
   */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Nur Zahlen

    // Format für Deutschland: 0123 4567890
    if (this.selectedCountry.code === 'DE' && value.length > 0) {
      if (value.length <= 4) {
        value = value;
      } else if (value.length <= 11) {
        value = value.substring(0, 4) + ' ' + value.substring(4);
      }
    }

    this.phoneNumberLocal = value;
    input.value = value;
    this.validatePhoneNumber();
  }
}

