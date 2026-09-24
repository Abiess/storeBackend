/// Schlankes Flutter-Gegenstueck zu `DhlTrackingValidationResult.java`
/// (storebackend.dto.dhl, siehe DHL-Einlagerungs-Audit vom 23.09.).
///
/// Bewusst NUR die Felder, die der erste Einlagerungs-Flow tatsaechlich
/// benoetigt/anzeigt (Status, kanonischer Piece-Code, ein paar Sendungs-
/// Infos fuer die VALID-Anzeige) - keine erfundenen Felder, aber robust
/// gegenueber zusaetzlichen/fehlenden Backend-Feldern (analog zu
/// `DhlParcelDto`).
///
/// `status` bleibt bewusst ein roher String (`VALID`/`NOT_FOUND`) statt
/// eines eigenen Dart-Enums, damit ein unerwarteter/neuer Backend-Wert
/// nicht zu einem Parse-Fehler fuehrt - der Aufrufer vergleicht explizit
/// gegen `'VALID'` (siehe `isValid`).
class DhlTrackingValidationDto {
  final String status;
  final String? trackingCode;
  final String? pieceCode;
  final String? productName;
  final double? weightKg;
  final String? shipmentStatus;

  /// Nur bei NOT_FOUND/technischen Fehlerantworten belegt - roher
  /// Backend-Text, wird 1:1 (nicht umformuliert) angezeigt, siehe
  /// `DhlStoreParcelScreen`.
  final String? dhlErrorMessage;

  const DhlTrackingValidationDto({
    required this.status,
    this.trackingCode,
    this.pieceCode,
    this.productName,
    this.weightKg,
    this.shipmentStatus,
    this.dhlErrorMessage,
  });

  bool get isValid => status == 'VALID';

  factory DhlTrackingValidationDto.fromJson(Map<String, dynamic> json) {
    return DhlTrackingValidationDto(
      status: json['status'] as String? ?? 'NOT_FOUND',
      trackingCode: json['trackingCode'] as String?,
      pieceCode: json['pieceCode'] as String?,
      productName: json['productName'] as String?,
      weightKg: (json['weightKg'] as num?)?.toDouble(),
      shipmentStatus: json['shipmentStatus'] as String?,
      dhlErrorMessage: json['dhlErrorMessage'] as String?,
    );
  }
}
