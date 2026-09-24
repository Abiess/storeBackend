/// Schlankes Flutter-Gegenstueck zu `DhlFindParcelRequest.java`
/// (storebackend.dto) - Request fuer `POST
/// /api/stores/{storeId}/dhl/parcels/find` (siehe `DhlController.findParcel`).
///
/// Bewusst nur das eine Feld, das der Endpoint tatsaechlich erwartet - der
/// rohe Tracking-Code wird serverseitig normalisiert, keine
/// Client-Normalisierung noetig.
class DhlFindParcelRequest {
  const DhlFindParcelRequest({required this.trackingCode});

  final String trackingCode;

  Map<String, dynamic> toJson() => {'trackingCode': trackingCode};
}
