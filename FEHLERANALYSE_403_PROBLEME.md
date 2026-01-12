# 🔧 Problembehebung - markt.ma Fehlerübersicht

## Datum: 2025-12-16

---

## ✅ Problem 1: Slug-Verfügbarkeitsprüfung gibt 403 Forbidden

### Symptom:
```
GET https://api.markt.ma/api/stores/check-slug/d
Status: 403 Forbidden
```

### Ursache:
Frontend rief falschen Endpoint auf:
- ❌ Frontend: `/api/stores/check-slug/{slug}`
- ✅ Backend: `/api/me/stores/check-slug/{slug}`

### Lösung:
**Datei:** `storeFrontend/src/app/core/services/store.service.ts`

**Geändert:**
```typescript
// Vorher:
return this.http.get<boolean>(`${environment.apiUrl}/stores/check-slug/${slug}`);

// Nachher:
return this.http.get<boolean>(`${environment.apiUrl}/me/stores/check-slug/${slug}`);
```

### Status: ✅ BEHOBEN
- Code wurde korrigiert
- Frontend-Build läuft
- Nach Deployment funktioniert die Live-Slug-Prüfung

---

## ⚠️ Problem 2: /api/subscriptions/plans gibt 403 Forbidden

### Symptom:
```
GET https://api.markt.ma/api/subscriptions/plans
Status: 403 Forbidden
Authorization: Bearer [JWT Token mit USER Rolle]
```

### Ursache:
Trotz `permitAll()` in SecurityConfig wird der Zugriff verweigert.

### Mögliche Ursachen:
1. **JWT-Token ist abgelaufen oder ungültig**
2. **CORS Preflight Request schlägt fehl**
3. **Nginx blockiert die Anfrage**
4. **Spring Security Regel-Reihenfolge ist falsch**

### Überprüfung notwendig:

#### A) Backend-Logs prüfen:
```bash
ssh root@[VPS-IP]
sudo journalctl -u storebackend -f
```

Suchen Sie nach:
- `JWT Filter - Processing request to: /api/subscriptions/plans`
- `Token validation result`
- Eventuell: `403 Access Denied`

#### B) Browser DevTools Network Tab:
- Gibt es einen OPTIONS-Request (Preflight) vor dem GET-Request?
- Welcher Status-Code kommt beim OPTIONS-Request?

#### C) JWT-Token prüfen:
```javascript
// In Browser Console:
const token = localStorage.getItem('authToken');
console.log(token);

// Token dekodieren (ohne Validierung):
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token Payload:', payload);
console.log('Expires:', new Date(payload.exp * 1000));
```

### Mögliche Lösungen:

#### Lösung 2.1: SecurityConfig Reihenfolge anpassen
```java
// In SecurityConfig.java - Zeile 48 NACH OBEN verschieben
.requestMatchers(HttpMethod.GET, "/api/subscriptions/plans").permitAll()
```

Sollte VOR `.anyRequest().authenticated()` stehen.

#### Lösung 2.2: @CrossOrigin am Controller entfernen
```java
// In SubscriptionController.java - Zeile 25 entfernen:
@CrossOrigin(origins = "*")  // <-- ENTFERNEN
```

Dies kann mit der globalen CORS-Config kollidieren.

#### Lösung 2.3: Endpoint als komplett öffentlich markieren
```java
// In SubscriptionController.java - Annotation hinzufügen:
@GetMapping("/plans")
@PermitAll  // <-- HINZUFÜGEN
public ResponseEntity<List<PlanDetails>> getAvailablePlans() {
```

---

## ⚠️ Problem 3: /api/stores/{id}/orders gibt 403 Forbidden

### Symptom:
```
GET https://api.markt.ma/api/stores/1/orders
Status: 403 Forbidden
Authorization: Bearer [JWT Token]
```

### Ursache:
Der User (ID: 2, Rolle: USER) versucht auf Store 1 zuzugreifen, ist aber möglicherweise nicht der Owner.

### Überprüfung:
```sql
-- Auf VPS in MySQL:
SELECT s.id, s.name, s.owner_id, u.email 
FROM stores s 
JOIN users u ON s.owner_id = u.id 
WHERE s.id = 1;

-- Ergebnis sollte zeigen: Gehört Store 1 dem User mit email "essoudati@hotmail.de"?
```

### Lösung:
Entweder:
1. User ist nicht Owner → Normales Verhalten (403 ist korrekt)
2. User IST Owner → Backend-Autorisierung prüfen

---

## ⚠️ Problem 4: /api/stores/{id}/categories gibt 403 Forbidden

### Symptom:
```
GET https://api.markt.ma/api/stores/1/categories
Status: 403 Forbidden
```

### Ursache:
Gleiche wie Problem 3 - Autorisierungsproblem.

### Lösung:
Prüfen Sie im Backend den CategoryController:
- Gibt es eine @PreAuthorize Annotation?
- Wird geprüft ob User der Store-Owner ist?

---

## ⚠️ Problem 5: currentUser ist undefined nach Registrierung

### Symptom:
```javascript
localStorage: {
  authToken: "[JWT Token]",
  currentUser: "undefined"  // <-- String "undefined" statt User-Objekt
}
```

### Ursache:
Bei der Registrierung wird `currentUser` nicht korrekt gesetzt.

### Überprüfung:

**Datei:** `storeFrontend/src/app/core/services/auth.service.ts`

Suchen Sie nach der `register()` Methode:
```typescript
register(data: RegisterRequest): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/register`, data)
    .pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          // Hier muss auch currentUser gesetzt werden!
          if (response.user) {
            this.currentUserSubject.next(response.user);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
          }
        }
      })
    );
}
```

### Lösung:
Prüfen Sie ob das Backend bei `/api/auth/register` auch das User-Objekt zurückgibt.

---

## ⚠️ Problem 6: Alert "Sie haben keine Berechtigung" beim Store erstellen

### Symptom:
```javascript
User: {id: 1, email: "essoudati@hotmail.de", roles: ["USER"]}
Alert: "Sie haben keine Berechtigung für diese Aktion."
```

### Ursache:
Frontend prüft Berechtigungen falsch - USER-Rolle sollte ausreichen.

### Überprüfung:

Suchen Sie im Frontend nach:
```typescript
// Wo wird dieser Alert ausgelöst?
```

Möglicherweise in:
- `create-store.component.ts`
- `store-guard.service.ts`
- `auth.service.ts`

### Lösung:
Entfernen oder korrigieren Sie die fehlerhafte Berechtigungsprüfung.

---

## ⚠️ Problem 7: Slug-Verfügbarkeitsprüfung bei jeder Eingabe fehlerhaft

### Symptom:
```
Fehler bei der Überprüfung der Slug-Verfügbarkeit
```
Kommt auch wenn Slug noch nicht in DB existiert.

### Ursache:
Frontend behandelt Fehlerfall falsch oder Backend antwortet mit Fehler.

### Lösung:
Nach dem neuen Build sollte dies behoben sein (durch Problem 1 Fix).

Wenn Problem weiterhin besteht:
```typescript
// In create-store.component.ts:
checkSlugAvailability() {
  this.storeService.checkSlugAvailability(this.slug)
    .subscribe({
      next: (available) => {
        this.slugAvailable = available;
        this.slugChecked = true;
      },
      error: (err) => {
        console.error('Slug check error:', err);
        // Bei Fehler als NICHT verfügbar behandeln
        this.slugAvailable = false;
        this.slugChecked = true;
      }
    });
}
```

---

## ⚠️ Problem 8: Frontend zeigt nur Text, keine Store-Erstellungs-Formular

### Symptom:
Unter `/subscription` wird nur Text angezeigt:
```
<p>Verwalten Sie Ihr Abonnement und upgraden Sie Ihren Plan</p>
```

### Ursache:
Component lädt Daten nicht oder Template ist unvollständig.

### Überprüfung:

**Datei:** `storeFrontend/src/app/features/subscription/subscription.component.html`

Sollte enthalten:
- Formular für Plan-Auswahl
- Liste der verfügbaren Pläne
- Upgrade/Downgrade Buttons

### Lösung:
Prüfen Sie ob Component korrekt implementiert ist.

---

## 📋 Nächste Schritte - Priorisiert

### 1. **SOFORT** - Frontend deployen
```bash
# Nach erfolgreichem Build:
cd dist/markt-ma-frontend
tar -czf frontend-dist.tar.gz *

# Auf VPS:
scp frontend-dist.tar.gz root@[VPS-IP]:/tmp/
ssh root@[VPS-IP]
sudo tar -xzf /tmp/frontend-dist.tar.gz -C /var/www/markt.ma/current
sudo chown -R www-data:www-data /var/www/markt.ma/current
sudo systemctl reload nginx
```

### 2. **WICHTIG** - Backend-Logs prüfen
```bash
ssh root@[VPS-IP]
sudo journalctl -u storebackend -f --since "5 minutes ago"
```

Reproduzieren Sie die Fehler und notieren Sie die Log-Ausgaben.

### 3. **WICHTIG** - SecurityConfig debuggen
```java
// In SecurityConfig.java - Logging hinzufügen:
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> {
            auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/subscriptions/plans").permitAll()
                .anyRequest().authenticated();
            
            // Logging
            logger.info("Security rules configured");
        });
    
    return http.build();
}
```

### 4. **OPTIONAL** - CORS Debug Mode
```java
// In WebConfig.java:
configuration.setAllowedOriginPatterns(Arrays.asList("*")); // Alle Origins temporär erlauben
```

### 5. **OPTIONAL** - Alle 403 Fehler loggen
```java
// Neue Klasse: AccessDeniedLogger.java
@Component
public class AccessDeniedLogger implements AccessDeniedHandler {
    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        logger.error("403 Access Denied: {} {} - User: {}", 
            request.getMethod(), request.getRequestURI(),
            SecurityContextHolder.getContext().getAuthentication());
        response.sendError(HttpServletResponse.SC_FORBIDDEN);
    }
}
```

---

## 🔍 Debugging-Checkliste

Wenn 403 Forbidden auftritt:

- [ ] Browser DevTools → Network → Request Headers prüfen
- [ ] Authorization Header vorhanden und gültig?
- [ ] OPTIONS Preflight-Request erfolgreich (200)?
- [ ] Backend-Logs zeigen JWT-Validierung?
- [ ] User-Rolle im Token vorhanden?
- [ ] SecurityConfig erlaubt den Endpoint?
- [ ] CORS-Header in Response vorhanden?
- [ ] Nginx leitet Anfrage korrekt weiter?

---

## 📝 Zusammenfassung

| Problem | Status | Priorität |
|---------|--------|-----------|
| Slug-Check 403 | ✅ Behoben | Hoch |
| Subscriptions/plans 403 | ⚠️ Offen | Hoch |
| Orders 403 | ⚠️ Offen | Mittel |
| Categories 403 | ⚠️ Offen | Mittel |
| currentUser undefined | ⚠️ Offen | Hoch |
| Berechtigungs-Alert | ⚠️ Offen | Mittel |
| Slug-Check Fehler | ⚠️ Offen | Niedrig |
| Subscription UI fehlt | ⚠️ Offen | Mittel |

---

**Erstellt:** 2025-12-16  
**Letzte Aktualisierung:** Nach Slug-Check Fix

