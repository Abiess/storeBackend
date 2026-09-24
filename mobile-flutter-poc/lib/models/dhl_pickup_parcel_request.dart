/// Schlankes Flutter-Gegenstueck zu `DhlPickupParcelRequest.java`
/// (storebackend.dto) - Request fuer `POST
/// /api/stores/{storeId}/dhl/parcels/pickup` (siehe
/// `DhlController.pickupParcel`).
///
/// Bewusst nur das eine Feld, das der Endpoint tatsaechlich erwartet - das
/// Backend validiert den Tracking-Code hierbei selbst NOCHMALS autoritativ
/// gegen die DHL Tracking API (siehe `DhlController.pickupParcel`,
/// "AUTHORITATIVE DHL VALIDATION"), bevor der Status auf `PICKED_UP`
/// gesetzt wird.
class DhlPickupParcelRequest {
  const DhlPickupParcelRequest({required this.trackingCode});

  final String trackingCode;

  Map<String, dynamic> toJson() => {'trackingCode': trackingCode};
}
