/// Flutter-Request fuer POST /api/stores/{storeId}/dhl/parcels/store.
///
/// Unterstuetzt wie der bestehende Angular-Flow sowohl automatische als auch
/// manuelle Lagerplatz-Zuweisung. Im manuellen Modus muss [slotCode] gesetzt
/// sein; die eigentliche Kapazitaets-/Konkurrenzpruefung bleibt autoritativ im
/// Backend.
class DhlStoreParcelRequest {
  const DhlStoreParcelRequest({
    required this.trackingCode,
    this.mode = 'auto',
    this.slotCode,
    this.notes,
  });

  final String trackingCode;
  final String mode;
  final String? slotCode;
  final String? notes;

  Map<String, dynamic> toJson() => {
        'trackingCode': trackingCode,
        'mode': mode,
        if (mode == 'manual' && slotCode != null && slotCode!.trim().isNotEmpty)
          'slotCode': slotCode!.trim(),
        if (notes != null && notes!.trim().isNotEmpty) 'notes': notes!.trim(),
      };
}
