// Bewusst reine Modell-/Parsing-Tests (kein Widget-Test): `AuthResponse`
// und `DocumentDto` haben keine Abhaengigkeit zu Platform-Channels
// (SecureStorage/ImagePicker), laufen daher zuverlaessig unter
// `flutter test` in CI ohne Emulator/Geraet und ohne Mocking von
// Platform-Plugins noetig.
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/models/auth_response.dart';
import 'package:markt_ma_documents_poc/models/document_dto.dart';

void main() {
  group('AuthResponse.fromJson', () {
    test('parst token + verschachtelten user 1:1 wie AuthResponse.java', () {
      final json = {
        'token': 'dummy.jwt.token',
        'user': {
          'id': 42,
          'email': 'demo@markt.ma',
          'name': 'Demo User',
          'role': 'USER',
          'roles': ['USER', 'ADMIN'],
          'appAccessMode': 'MANAGED',
        },
      };

      final result = AuthResponse.fromJson(json);

      expect(result.token, 'dummy.jwt.token');
      expect(result.user.id, 42);
      expect(result.user.email, 'demo@markt.ma');
      expect(result.user.roles, ['USER', 'ADMIN']);
      expect(result.user.appAccessMode, 'MANAGED');
    });

    test('kommt ohne optionale Felder klar (nur Pflichtfelder gesetzt)', () {
      final json = {
        'token': 'x',
        'user': {'id': 1, 'email': 'a@b.c'},
      };

      final result = AuthResponse.fromJson(json);

      expect(result.user.name, isNull);
      expect(result.user.roles, isEmpty);
    });
  });

  group('DocumentDto.fromJson', () {
    test('parst alle Felder 1:1 wie DocumentDTO.java', () {
      final json = {
        'id': 100,
        'ownerUserId': 1,
        'ownerEmail': 'owner@markt.ma',
        'title': 'HUK Kfz-Versicherung',
        'category': 'Vertrag',
        'note': 'Notiz',
        'documentDate': '2026-01-15',
        'expiryDate': '2027-01-15',
        'hasFile': true,
        'originalFilename': 'foto.jpg',
        'mimeType': 'image/jpeg',
        'size': 123456,
        'createdAt': '2026-01-15T10:00:00',
        'updatedAt': '2026-01-15T10:00:00',
        'sharedWithMe': false,
        'permission': null,
      };

      final doc = DocumentDto.fromJson(json);

      expect(doc.id, 100);
      expect(doc.title, 'HUK Kfz-Versicherung');
      expect(doc.hasFile, isTrue);
      expect(doc.mimeType, 'image/jpeg');
      expect(doc.sharedWithMe, isFalse);
    });

    test('faengt fehlenden Titel robust ab statt zu crashen', () {
      final json = {'id': 1, 'ownerUserId': 1, 'hasFile': false};

      final doc = DocumentDto.fromJson(json);

      expect(doc.title, '(ohne Titel)');
    });
  });
}
