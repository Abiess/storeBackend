import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

typedef BarcodeCameraScanLauncher = Future<String?> Function(BuildContext context);

Future<String?> showMarktBarcodeCameraScanner(BuildContext context) {
  return Navigator.of(context).push<String>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => const MarktBarcodeCameraScanner(),
    ),
  );
}

/// Kleiner, gemeinsamer Kamera-Scanner fuer DHL.
///
/// Die Fachlogik bleibt bewusst ausserhalb dieses Widgets: Nach einem Treffer
/// wird nur der Barcode zurueckgegeben. Einlagern/Abholen schicken ihn danach
/// durch exakt denselben bestehenden Validierungs-/DB-Suchpfad wie HID-Scanner
/// und manuelle Eingabe.
class MarktBarcodeCameraScanner extends StatefulWidget {
  const MarktBarcodeCameraScanner({super.key});

  @override
  State<MarktBarcodeCameraScanner> createState() => _MarktBarcodeCameraScannerState();
}

class _MarktBarcodeCameraScannerState extends State<MarktBarcodeCameraScanner> {
  bool _handled = false;

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value == null || value.isEmpty) continue;
      _handled = true;
      Navigator.of(context).pop(value);
      return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Barcode scannen'),
        foregroundColor: Colors.white,
        backgroundColor: Colors.black,
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(onDetect: _onDetect),
          IgnorePointer(
            child: Center(
              child: Container(
                width: 280,
                height: 170,
                decoration: BoxDecoration(
                  border: Border.all(color: const Color(0xFF667EEA), width: 3),
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const Positioned(
            left: 24,
            right: 24,
            bottom: 40,
            child: SafeArea(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Color(0xCC000000),
                  borderRadius: BorderRadius.all(Radius.circular(10)),
                ),
                child: Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'Barcode in den Rahmen halten. Nach der Erkennung geht es automatisch weiter.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
