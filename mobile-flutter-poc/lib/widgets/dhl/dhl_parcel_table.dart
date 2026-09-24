import 'package:flutter/material.dart';

import '../../models/dhl_parcel_dto.dart';
import '../../theme/markt_theme.dart';
import '../shared/markt_card.dart';
import 'dhl_parcel_format.dart';
import 'dhl_parcel_status_badge.dart';

/// Kompakte, gut scannbare Desktop-Darstellung der "Pakete im Laden"-Liste
/// (DHL-UI-Pass, 23.09.) - ersetzt die vorherige 3-Spalten-Card-Wand auf
/// echten Desktop-Breiten (`MarktBreakpoints.isDesktop`, >= 1024px, siehe
/// `MarktResponsiveDataList.wideBuilder`).
///
/// Struktur/Spaltenaufteilung inspiriert von der `DataTable`-in-Card-
/// Darstellung aus `abuanwar072/Flutter-Responsive-Admin-Panel-or-
/// Dashboard` (`recent_files.dart`, MIT) - hier bewusst als eigene, simple
/// Row-basierte Liste statt Materials `DataTable` neu geschrieben (kein
/// horizontales Ueberlauf-/Scroll-Problem bei schmaleren Desktop-Breiten,
/// volle Kontrolle ueber Spaltenverhaeltnisse/Textprioritaet).
///
/// Spalten: Sendungsnummer (visuell priorisiert, fett) | Lagerplatz
/// (schnell erfassbar) | Eingelagert | Status (siehe [DhlParcelStatusBadge]).
/// Reine Darstellung - keine Sortierung/Aktionen/Selektion in diesem
/// ersten Schritt.
class DhlParcelTable extends StatelessWidget {
  const DhlParcelTable({super.key, required this.parcels});

  final List<DhlParcelDto> parcels;

  static const _trackingFlex = 4;
  static const _shelfFlex = 2;
  static const _receivedFlex = 3;
  static const _statusFlex = 3;

  @override
  Widget build(BuildContext context) {
    return MarktCard(
      padding: EdgeInsets.zero,
      margin: EdgeInsets.zero,
      child: Column(
        children: [
          const _TableHeaderRow(
            trackingFlex: _trackingFlex,
            shelfFlex: _shelfFlex,
            receivedFlex: _receivedFlex,
            statusFlex: _statusFlex,
          ),
          Expanded(
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: parcels.length,
              separatorBuilder: (context, _) => Divider(
                height: 1,
                thickness: 1,
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              itemBuilder: (context, index) => _TableRow(
                parcel: parcels[index],
                trackingFlex: _trackingFlex,
                shelfFlex: _shelfFlex,
                receivedFlex: _receivedFlex,
                statusFlex: _statusFlex,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TableHeaderRow extends StatelessWidget {
  const _TableHeaderRow({
    required this.trackingFlex,
    required this.shelfFlex,
    required this.receivedFlex,
    required this.statusFlex,
  });

  final int trackingFlex;
  final int shelfFlex;
  final int receivedFlex;
  final int statusFlex;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final labelStyle = Theme.of(context).textTheme.labelMedium?.copyWith(
          color: colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.4,
        );

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHigh,
        border: Border(bottom: BorderSide(color: colorScheme.outlineVariant)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: MarktSpacing.sm),
      child: Row(
        children: [
          Expanded(flex: trackingFlex, child: Text('Sendungsnummer', style: labelStyle)),
          Expanded(flex: shelfFlex, child: Text('Lagerplatz', style: labelStyle)),
          Expanded(flex: receivedFlex, child: Text('Eingelagert', style: labelStyle)),
          Expanded(flex: statusFlex, child: Text('Status', style: labelStyle)),
        ],
      ),
    );
  }
}

class _TableRow extends StatelessWidget {
  const _TableRow({
    required this.parcel,
    required this.trackingFlex,
    required this.shelfFlex,
    required this.receivedFlex,
    required this.statusFlex,
  });

  final DhlParcelDto parcel;
  final int trackingFlex;
  final int shelfFlex;
  final int receivedFlex;
  final int statusFlex;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final receivedLabel = DhlParcelFormat.formatReceivedAt(parcel.receivedAt) ?? '-';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.lg, vertical: MarktSpacing.md),
      child: Row(
        children: [
          // Trackingnummer visuell priorisiert: fett + groesser als die
          // uebrigen Spalten (siehe Aufgabenstellung).
          Expanded(
            flex: trackingFlex,
            child: Text(
              parcel.trackingCode,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          // Lagerplatz sehr schnell erfassbar: eigener kompakter Chip statt
          // reinem Fliesstext, mit Standort-Icon.
          Expanded(
            flex: shelfFlex,
            child: _ShelfChip(shelfLocation: parcel.shelfLocation),
          ),
          Expanded(
            flex: receivedFlex,
            child: Text(
              receivedLabel,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
          ),
          Expanded(
            flex: statusFlex,
            child: Align(alignment: Alignment.centerLeft, child: DhlParcelStatusBadge(parcel: parcel)),
          ),
        ],
      ),
    );
  }
}

/// Kompakter Lagerplatz-Chip - schneller erfassbar als reiner Fliesstext
/// (siehe Aufgabenstellung "Lagerplatz sehr schnell erfassbar machen").
/// Fehlt der Lagerplatz (noch nicht zugewiesen), wird das explizit als
/// "-" ausgewiesen statt einen Platzhalter zu erfinden.
class _ShelfChip extends StatelessWidget {
  const _ShelfChip({required this.shelfLocation});

  final String? shelfLocation;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final hasShelf = shelfLocation != null && shelfLocation!.trim().isNotEmpty;

    if (!hasShelf) {
      return Text('-', style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant));
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.shelves, size: 16, color: colorScheme.onSurfaceVariant),
        const SizedBox(width: MarktSpacing.xs),
        Flexible(
          child: Text(
            shelfLocation!,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }
}
