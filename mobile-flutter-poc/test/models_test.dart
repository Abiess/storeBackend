// Bewusst reine Modell-/Parsing-Tests (kein Widget-Test): `AuthResponse`
// und `DocumentDto` haben keine Abhaengigkeit zu Platform-Channels
// (SecureStorage/ImagePicker), laufen daher zuverlaessig unter
// `flutter test` in CI ohne Emulator/Geraet und ohne Mocking von
// Platform-Plugins noetig.
import 'package:flutter_test/flutter_test.dart';
import 'package:markt_ma_documents_poc/models/auth_response.dart';
import 'package:markt_ma_documents_poc/models/dhl_parcel_dto.dart';
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

    test('parst user.apps[] (AppEntitlementDTO: app/storeId/enabled)', () {
      final json = {
        'token': 'x',
        'user': {
          'id': 1,
          'email': 'a@b.c',
          'apps': [
            {'app': 'DOCUMENTS', 'storeId': null, 'enabled': true},
            {'app': 'DHL', 'storeId': 7, 'enabled': true},
          ],
        },
      };

      final result = AuthResponse.fromJson(json);

      expect(result.user.apps, hasLength(2));
      expect(result.user.apps[1].app, 'DHL');
      expect(result.user.apps[1].storeId, 7);
      expect(result.user.apps[1].enabled, isTrue);
    });

    test('kommt ohne apps-Feld klar (leere Liste statt Crash)', () {
      final json = {
        'token': 'x',
        'user': {'id': 1, 'email': 'a@b.c'},
      };

      final result = AuthResponse.fromJson(json);

      expect(result.user.apps, isEmpty);
    });
  });

  group('AuthUser.storeIdForApp (fail-closed)', () {
    AuthUser userWithApps(List<AppEntitlement> apps) {
      return AuthUser(id: 1, email: 'a@b.c', apps: apps);
    }

    test('liefert storeId fuer aktiviertes, passendes Entitlement', () {
      final user = userWithApps([
        AppEntitlement(app: 'DHL', storeId: 7, enabled: true),
      ]);

      expect(user.storeIdForApp('DHL'), 7);
    });

    test('liefert null wenn Entitlement vorhanden aber disabled ist', () {
      final user = userWithApps([
        AppEntitlement(app: 'DHL', storeId: 7, enabled: false),
      ]);

      expect(user.storeIdForApp('DHL'), isNull);
    });

    test('liefert null wenn die App gar nicht in apps[] vorkommt', () {
      final user = userWithApps([
        AppEntitlement(app: 'DOCUMENTS', storeId: null, enabled: true),
      ]);

      expect(user.storeIdForApp('DHL'), isNull);
    });

    test('liefert null bei komplett leerer apps-Liste', () {
      final user = userWithApps(const []);

      expect(user.storeIdForApp('DHL'), isNull);
    });

    test('waehlt aus mehreren Eintraegen gezielt den passenden aus', () {
      final user = userWithApps([
        AppEntitlement(app: 'MARITIME', storeId: 3, enabled: true),
        AppEntitlement(app: 'DHL', storeId: 9, enabled: true),
      ]);

      expect(user.storeIdForApp('DHL'), 9);
      expect(user.storeIdForApp('MARITIME'), 3);
    });
  });

  group('DhlParcelDto.fromJson', () {
    test('parst alle Felder 1:1 wie DhlParcelResponse.java', () {
      final json = {
        'id': 1,
        'storeId': 7,
        'trackingCode': '00340434161094159273',
        'shelfLocation': 'Regal A3',
        'receivedAt': '2026-01-15T10:00:00',
        'status': 'STORED',
        'standardEventCode': '1',
      };

      final dto = DhlParcelDto.fromJson(json);

      expect(dto.id, 1);
      expect(dto.storeId, 7);
      expect(dto.trackingCode, '00340434161094159273');
      expect(dto.shelfLocation, 'Regal A3');
      expect(dto.receivedAt, '2026-01-15T10:00:00');
      expect(dto.status, 'STORED');
      expect(dto.standardEventCode, '1');
    });

    test('faengt fehlende optionale Felder robust ab statt zu crashen', () {
      final json = {'id': 2, 'storeId': 7, 'trackingCode': 'X1'};

      final dto = DhlParcelDto.fromJson(json);

      expect(dto.shelfLocation, isNull);
      expect(dto.receivedAt, isNull);
      expect(dto.status, 'STORED');
      expect(dto.standardEventCode, isNull);
    });

    test('faengt sogar eine komplett leere Map robust ab', () {
      final dto = DhlParcelDto.fromJson(const {});

      expect(dto.id, 0);
      expect(dto.trackingCode, '-');
      expect(dto.status, 'STORED');
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
