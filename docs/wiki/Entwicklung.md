# Entwicklung

[Zur Übersicht](README.md)

## Angular

Im Verzeichnis `storeFrontend`:

```bash
npm ci --legacy-peer-deps
npm run build:prod
```

[Frontend PR Build](../../../.github/workflows/frontend-pr.yml) prüft Pull Requests mit einem Produktionsbuild. Der Workflow führt kein Deployment aus.

## Backend

Die [Backend-PR-Prüfung](../../../.github/workflows/backend-pr.yml) verwendet Java 21 und führt eine gezielte Maven-Testsammlung für Warenkorb, Aufträge und Kundensitzungen aus. Sie ist kein vollständiger Testlauf.

```bash
mvn -B -ntp -Dtest=CartServiceStoreScopeTest,PublicOrderCartStoreScopeTest,OrderTrackingStoreFilterTest,CustomerAppSessionServiceTest,OrderTrackingDetailsTest test
```

## Flutter

Im Verzeichnis `mobile-flutter-poc`:

```bash
flutter pub get
flutter analyze
flutter test
flutter build apk --debug --flavor shop -t lib/entrypoints/main_shop.dart
```

Der [Flutter-Workflow](../../../.github/workflows/flutter-poc.yml) ist die Referenz für die verwendete SDK-Version und Build-Befehle.

## Neueste APK finden

1. [GitHub Actions öffnen](https://github.com/Abiess/storeBackend/actions).
2. Einen erfolgreichen Lauf des Flutter-PoC-Workflows auswählen.
3. Branch und Commit prüfen: Ein PR-Artefakt kann Änderungen enthalten, die noch nicht auf master sind.
4. Unter **Artifacts** das passende ZIP herunterladen.

| Artefakt | Inhalt |
|---|---|
| `markt-ma-flutter-shop-preview-apk` | Shop-Vorschau |
| `markt-ma-flutter-marrakesch-preview-apk` | Shop-Vorschau mit voreingestelltem Marrakesch-Slug |
| `markt-ma-flutter-poc` | Documents-App |

Diese APKs werden im Workflow als Debug-Builds erzeugt.
