/// Spiegelt 1:1 `AuthResponse.java` (storebackend.dto). Es werden bewusst
/// KEINE eigenen, parallelen Vertragsnamen erfunden - Feldnamen exakt wie
/// im Backend: `token`, `user.id`, `user.email`, `user.name`, `user.role`,
/// `user.roles`, `user.appAccessMode`, `user.apps`.
class AuthResponse {
  final String token;
  final AuthUser user;

  AuthResponse({required this.token, required this.user});

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      token: json['token'] as String,
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>? ?? const {}),
    );
  }
}

/// Spiegelt `AuthResponse.UserDTO`. Nur die fuer den PoC relevanten Felder
/// werden ausgewertet; unbekannte/zusaetzliche Felder werden ignoriert statt
/// einen Parse-Fehler zu werfen (robust gegen zukuenftige Backend-Felder).
class AuthUser {
  final int id;
  final String email;
  final String? name;
  final String? role;
  final List<String> roles;
  final String? appAccessMode;

  /// Spiegelt `UserDTO.apps` (`List<AppEntitlementDTO>`, siehe DHL-Audit vom
  /// 23.09.) - die rohe Liste der EXPLIZITEN App-Entitlement-Eintraege
  /// (`{app, storeId, enabled}`). Bewusst keine implizite Auffuellung: fehlt
  /// ein Eintrag fuer eine App, ist das NICHT gleichbedeutend mit "enabled:
  /// false" fuer diese App, sondern schlicht "keine Aussage" - identisch zur
  /// Backend-Semantik.
  final List<AppEntitlement> apps;

  AuthUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
    this.roles = const [],
    this.appAccessMode,
    this.apps = const [],
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      email: json['email'] as String? ?? '',
      name: json['name'] as String?,
      role: json['role'] as String?,
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      appAccessMode: json['appAccessMode'] as String?,
      apps: (json['apps'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .map(AppEntitlement.fromJson)
              .toList() ??
          const [],
    );
  }

  /// Loest die `storeId` fuer eine store-gebundene App auf (z.B. `"DHL"`,
  /// vergleiche `AppKey.DHL` im Backend) - FAIL CLOSED:
  ///
  /// Gibt `null` zurueck, wenn kein passender, EXPLIZIT aktivierter
  /// Entitlement-Eintrag existiert (App fehlt komplett in `apps`, ist
  /// vorhanden aber `enabled: false`, oder hat aus irgendeinem Grund keine
  /// `storeId`). Es wird NIE geraten/der erstbeste Store genommen - ein
  /// Consumer (z.B. `DhlHomeScreen`) MUSS mit `null` einen
  /// Kein-Zugriff-Zustand zeigen statt eine Fachlichkeit ohne gesicherten
  /// Store-Kontext zu laden.
  int? storeIdForApp(String appKey) {
    for (final entitlement in apps) {
      if (entitlement.app == appKey && entitlement.enabled) {
        return entitlement.storeId;
      }
    }
    return null;
  }
}

/// Spiegelt `AppEntitlementDTO.java` (storebackend.dto) 1:1 - keine eigenen,
/// zusaetzlichen Felder. `app` bleibt bewusst ein roher `String` (nicht ein
/// Dart-`enum`), damit neue Backend-`AppKey`-Werte (siehe `AppKey.java`)
/// nicht zu einem Parse-Fehler in bestehenden Flutter-Apps fuehren.
class AppEntitlement {
  final String app;
  final int? storeId;
  final bool enabled;

  AppEntitlement({required this.app, this.storeId, required this.enabled});

  factory AppEntitlement.fromJson(Map<String, dynamic> json) {
    return AppEntitlement(
      app: json['app'] as String? ?? '',
      storeId: (json['storeId'] as num?)?.toInt(),
      enabled: json['enabled'] as bool? ?? false,
    );
  }
}
