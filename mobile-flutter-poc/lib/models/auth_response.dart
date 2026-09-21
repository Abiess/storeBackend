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

  AuthUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
    this.roles = const [],
    this.appAccessMode,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: (json['id'] as num?)?.toInt() ?? 0,
      email: json['email'] as String? ?? '',
      name: json['name'] as String?,
      role: json['role'] as String?,
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? const [],
      appAccessMode: json['appAccessMode'] as String?,
    );
  }
}
