import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';

/// Gemeinsame Format-/Status-Hilfsfunktionen fuer alle DHL-Parcel-
/// Darstellungen (`DhlParcelCard`, `DhlParcelTable`, `DhlParcelStatusBadge`).
///
/// Rein praesentational (Farbe/Label/Datumsformat) - KEIN eigenes
/// Status-Mapping auf erfundene Klartexte, KEINE Fachlogik. Extrahiert aus
/// der urspruenglich nur in `DhlParcelCard` vorhandenen Logik (DHL-UI-Pass,
/// 23.09.), damit die neue `DhlParcelTable` (Desktop) dieselbe Darstellung
/// wiederverwendet statt sie zu duplizieren.
class DhlParcelFormat {
  const DhlParcelFormat._();

  /// Sendungsstatus-Anzeige: bevorzugt das DHL-Tracking-Metadatenfeld
  /// `standardEventCode` (falls vorhanden, siehe Audit), sonst der lokale
  /// Paket-Status (`STORED`/`PICKED_UP`/`CANCELLED`). Kein eigenes Mapping
  /// auf Klartext-Labels - reine, unveraenderte Anzeige der Backend-Werte.
  static String statusLabel(DhlParcelDto parcel) {
    final eventCode = parcel.standardEventCode;
    if (eventCode != null && eventCode.isNotEmpty) {
      return '${parcel.status} ($eventCode)';
    }
    return parcel.status;
  }

  static Color accentColorForStatus(ColorScheme colorScheme, String status) {
    switch (status) {
      case 'PICKED_UP':
        return colorScheme.tertiary;
      case 'CANCELLED':
        return colorScheme.error;
      case 'STORED':
      default:
        return colorScheme.primary;
    }
  }

  /// `receivedAt` ist ein roher ISO-8601-String (siehe `DhlParcelDto`) -
  /// hier nur minimal auf Datum+Uhrzeit ohne Sekunden gekuerzt, falls
  /// parsebar; sonst wird der Rohwert unveraendert angezeigt statt einen
  /// Fehler zu werfen.
  static String? formatReceivedAt(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return raw;
    return '${_fourDigits(parsed.year)}-${_twoDigits(parsed.month)}-${_twoDigits(parsed.day)} '
        '${_twoDigits(parsed.hour)}:${_twoDigits(parsed.minute)}';
  }

  /// `true`, wenn `receivedAt` (parsebar) auf denselben Kalendertag wie
  /// [now] faellt - fuer die "Heute eingelagert"-Kennzahl (siehe
  /// `DhlHomeScreen`). Nicht parsebare/fehlende Werte zaehlen bewusst
  /// NICHT als "heute" (kein Rateglueck).
  static bool isReceivedToday(String? raw, DateTime now) {
    if (raw == null || raw.isEmpty) return false;
    final parsed = DateTime.tryParse(raw);
    if (parsed == null) return false;
    return parsed.year == now.year && parsed.month == now.month && parsed.day == now.day;
  }

  static String _twoDigits(int n) => n.toString().padLeft(2, '0');
  static String _fourDigits(int n) => n.toString().padLeft(4, '0');
}
