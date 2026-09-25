/// Schlankes Flutter-Gegenstueck zu `DhlParcelResponse.java`
/// (storebackend.dto, siehe DHL-Audit vom 23.09.).
///
/// Enthaelt die Felder fuer "Pakete im Laden" und die Abholansicht
/// (Trackingnummer, Lagerplatz, Zeitpunkte, Notiz, Status) - robust gegenueber
/// zusaetzlichen/fehlenden Backend-Feldern (analog zu `DocumentDto`).
///
/// `receivedAt` bleibt bewusst ein roher ISO-8601-String (kein eigenes
/// Datum-Parsing/Locale-Handling) - identisch zur bestehenden Konvention in
/// `DocumentDto.documentDate`/`createdAt`.
class DhlParcelDto {
  final int id;
  final int storeId;
  final String trackingCode;
  final String? shelfLocation;
  final String? receivedAt;
  final String? pickedUpAt;
  final String? notes;
  final String status;
  final String? standardEventCode;

  DhlParcelDto({
    required this.id,
    required this.storeId,
    required this.trackingCode,
    this.shelfLocation,
    this.receivedAt,
    this.pickedUpAt,
    this.notes,
    required this.status,
    this.standardEventCode,
  });

  factory DhlParcelDto.fromJson(Map<String, dynamic> json) {
    return DhlParcelDto(
      id: (json['id'] as num?)?.toInt() ?? 0,
      storeId: (json['storeId'] as num?)?.toInt() ?? 0,
      trackingCode: json['trackingCode'] as String? ?? '-',
      shelfLocation: json['shelfLocation'] as String?,
      receivedAt: json['receivedAt'] as String?,
      pickedUpAt: json['pickedUpAt'] as String?,
      notes: json['notes'] as String?,
      // `status` ist im Backend ein Enum (`DhlParcelStatus`: STORED |
      // PICKED_UP | CANCELLED), das Jackson standardmaessig als String
      // serialisiert - hier bewusst als roher String belassen statt ein
      // eigenes Dart-Enum zu spiegeln, damit neue Statuswerte nicht zu
      // einem Parse-Fehler fuehren.
      status: json['status'] as String? ?? 'STORED',
      standardEventCode: json['standardEventCode'] as String?,
    );
  }
}
