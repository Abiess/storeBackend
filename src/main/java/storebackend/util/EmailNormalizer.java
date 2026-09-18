package storebackend.util;

import java.util.Locale;

/**
 * Zentrale, einmalige Normalisierung von E-Mail-Adressen für die gesamte
 * Anwendung (Registrierung, Login, Quick/Phone-Auth, Passwort-Reset,
 * E-Mail-Verifizierung, Team-Invitations, Admin-/Import-User-Erzeugung, ...).
 *
 * HINTERGRUND: Zwei User mit identischer E-Mail in unterschiedlicher
 * Groß-/Kleinschreibung (z.B. {@code essoudati@hotmail.de} vs.
 * {@code Essoudati@hotmail.de}) dürfen künftig nicht mehr entstehen können.
 * Daher wird JEDE E-Mail, die entweder gespeichert (siehe
 * {@code storebackend.entity.User#setEmail}) oder für eine
 * Existenz-/Login-Prüfung verwendet wird, ausschließlich über diese eine
 * Methode normalisiert - keine verstreute {@code toLowerCase()}/{@code trim()}
 * Logik an einzelnen Call-Sites.
 *
 * Regel: {@code trim()} + {@code toLowerCase(Locale.ROOT)}.
 * {@code Locale.ROOT} bewusst statt der System-Locale, damit z.B. die
 * türkische "i"-Sonderregel (İ/i) nicht zu abweichenden Ergebnissen je nach
 * Server-Locale führt.
 */
public final class EmailNormalizer {

    private EmailNormalizer() {
        // Utility-Klasse, keine Instanzen
    }

    /**
     * Normalisiert eine E-Mail-Adresse für Speicherung und Vergleich.
     *
     * @param email Roh-E-Mail (z.B. aus Request-Body), darf {@code null} sein.
     * @return getrimmte, kleingeschriebene E-Mail, oder {@code null}/leer,
     *         falls die Eingabe {@code null} bzw. leer war.
     */
    public static String normalize(String email) {
        if (email == null) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
