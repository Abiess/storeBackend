import 'entrypoints/main_documents.dart' as documents_entrypoint;

/// Bestehende CI-/lokale Kommandos (`flutter run`, `flutter build ...` ohne
/// `-t`) erwarten weiterhin `lib/main.dart` als Default-Entrypoint (siehe
/// Multi-App-Audit vom 22.09.) - dieser startet deshalb unveraendert die
/// Documents-App, delegiert dafuer aber vollstaendig an den eigenstaendigen
/// `lib/entrypoints/main_documents.dart`, statt die Konfiguration hier ein
/// zweites Mal zu duplizieren. Kuenftige Apps werden NICHT hierueber
/// gestartet, sondern ausschliesslich ueber ihren eigenen
/// `lib/entrypoints/main_<app>.dart` (z.B. via `flutter build web -t
/// lib/entrypoints/main_maritime.dart`).
void main() => documents_entrypoint.main();

