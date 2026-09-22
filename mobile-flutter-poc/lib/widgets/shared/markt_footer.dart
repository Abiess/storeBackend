import 'package:flutter/material.dart';

import '../../theme/markt_theme.dart';

/// Dezenter, generischer Footer (Shared UI Primitive, Phase 1).
///
/// Wird von [MarktAppShell] unterhalb des Content-Bereichs auf
/// Desktop/Tablet eingeblendet. Kennt bewusst KEINE Fachlichkeit (kein
/// "Documents"/"Maritime") - der Text ist optional ueberschreibbar,
/// Default ist ein generischer markt.ma-Copyright-Hinweis.
class MarktFooter extends StatelessWidget {
  const MarktFooter({super.key, this.text});

  final String? text;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: colorScheme.outlineVariant)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: MarktSpacing.xl, vertical: MarktSpacing.sm),
      alignment: Alignment.centerRight,
      child: Text(
        text ?? '\u00A9 ${DateTime.now().year} markt.ma',
        style: textTheme.bodySmall?.copyWith(color: colorScheme.onSurfaceVariant),
      ),
    );
  }
}
