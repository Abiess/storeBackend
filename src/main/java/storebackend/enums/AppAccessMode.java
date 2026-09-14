package storebackend.enums;

/**
 * App-Entitlement-Konzept (Phase 1) - Zugriffsmodus eines Users, userweit
 * (nicht pro App) ermittelt aus {@link storebackend.entity.UserAppEntitlement}.
 *
 * LEGACY:
 *   User hat ÜBERHAUPT KEINEN UserAppEntitlement-Eintrag (egal für welche
 *   App/welchen Store) -> Zugriff auf ALLE Apps bleibt exakt wie bisher
 *   (kein Verhaltensunterschied gegenüber dem Stand vor Einführung des
 *   App-Entitlement-Konzepts).
 *
 * MANAGED:
 *   Sobald für den User IRGENDEIN Eintrag existiert -> ab diesem Zeitpunkt
 *   gilt für den GESAMTEN User eine Positivliste: nur explizite
 *   enabled=true-Einträge gewähren Zugriff, alles andere (fehlende App,
 *   fehlender Store, enabled=false) ist gesperrt.
 */
public enum AppAccessMode {
    LEGACY,
    MANAGED
}
