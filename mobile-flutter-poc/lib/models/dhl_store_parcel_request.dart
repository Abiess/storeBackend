/// Schlankes Flutter-Gegenstueck zur Phase-2-Request von
/// `POST /api/stores/{storeId}/dhl/parcels/store` (siehe
/// DHL-Einlagerungs-Audit vom 23.09., `DhlController.storeParcel`).
///
/// Bildet bewusst NUR den in diesem Implementierungsschritt tatsaechlich
/// verwendeten AUTO-Modus ab (`mode: "auto"`, kein `slotCode` - der
/// Backend-Endpoint alloziert den Lagerplatz in diesem Fall selbst,
/// race-condition-sicher, siehe `DhlParcelService.storeParcel`). KEINE
/// clientseitige Lagerplatzberechnung, KEIN `slotCode`-Feld in diesem
/// Schritt (manuelle Slot-Auswahl ist ausdruecklich ausgeklammert).
class DhlStoreParcelRequest {
  const DhlStoreParcelRequest({required this.trackingCode, this.mode = 'auto', this.notes});

  final String trackingCode;
  final String mode;
  final String? notes;

  Map<String, dynamic> toJson() => {
        'trackingCode': trackingCode,
        'mode': mode,
        if (notes != null && notes!.trim().isNotEmpty) 'notes': notes!.trim(),
      };
}
