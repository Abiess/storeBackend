# Spring Boot "No static resource" Error - Vollständige Analyse

## Problem: HTTP 500 statt REST Endpoint

**Fehlermeldung:**
```
No static resource api/public/customer/orders
org.springframework.web.servlet.resource.NoResourceFoundException
```

---

## 1. WARUM Spring die URL als statische Ressource behandelt

### Handler-Mapping-Reihenfolge in Spring MVC:

```java
DispatcherServlet empfängt Request
    ↓
1. RequestMappingHandlerMapping
   - Sucht @RestController/@Controller mit @GetMapping
   - Wenn NICHT gefunden → weiter
    ↓
2. BeanNameUrlHandlerMapping
   - Sucht Bean mit Name = URL
   - Wenn NICHT gefunden → weiter
    ↓
3. RouterFunctionMapping
   - Sucht RouterFunction (funktionales Routing)
   - Wenn NICHT gefunden → weiter
    ↓
4. SimpleUrlHandlerMapping
   - Letzter Fallback
   - Mapped zu ResourceHttpRequestHandler
   - Behandelt ALLE übrigen URLs als statische Ressourcen
    ↓
ResourceHttpRequestHandler versucht Datei zu laden
   - Sucht in /static, /public, /resources, /META-INF/resources
   - Datei existiert nicht
   - Wirft NoResourceFoundException
    ↓
HTTP 500 Internal Server Error
```

**Kernproblem:** 
Wenn KEIN Controller die URL mapped, landet die Anfrage beim ResourceHttpRequestHandler, 
der versucht, sie als statische Datei zu behandeln.

---

## 2. Der interne Spring MVC Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│  HTTP Request: GET /api/public/customer/orders               │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  1. Tomcat/Servlet Container                                 │
│     - Empfängt HTTP Request                                  │
│     - Leitet an Filter Chain weiter                          │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  2. Spring Security FilterChain                              │
│     - SecurityContextPersistenceFilter                       │
│     - JwtAuthenticationFilter (CUSTOM)                       │
│     - UsernamePasswordAuthenticationFilter                   │
│     - FilterSecurityInterceptor                              │
│     ✅ Wenn hier durchgekommen → User ist authentifiziert    │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  3. DispatcherServlet                                        │
│     - Zentraler Request Handler                              │
│     - Ruft HandlerMapping auf                                │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  4. HandlerMapping Suche                                     │
│                                                              │
│  a) RequestMappingHandlerMapping                            │
│     @RestController mit @GetMapping("/api/public/..")       │
│     ❌ NICHT GEFUNDEN                                        │
│                                                              │
│  b) BeanNameUrlHandlerMapping                               │
│     ❌ NICHT GEFUNDEN                                        │
│                                                              │
│  c) RouterFunctionMapping                                   │
│     ❌ NICHT GEFUNDEN                                        │
│                                                              │
│  d) SimpleUrlHandlerMapping (FALLBACK!)                     │
│     → Mapped zu ResourceHttpRequestHandler                  │
│     → Versucht statische Ressource zu laden                 │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  5. ResourceHttpRequestHandler                               │
│     - Sucht in: /static/, /public/, /resources/             │
│     - Datei: api/public/customer/orders                     │
│     - Existiert nicht                                        │
│     - Wirft NoResourceFoundException                         │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│  6. Exception Handler                                        │
│     - Standardmäßig: HTTP 500                                │
│     - Mit @ControllerAdvice: HTTP 404                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Warum dies KEIN Spring Security / JWT Problem ist

### Beweise, dass Security NICHT das Problem ist:

```java
// 1. Spring Security Filter Chain läuft VOR DispatcherServlet
SecurityFilterChain → JwtFilter → DispatcherServlet → HandlerMapping

// 2. Wenn Sie HTTP 500 bekommen:
✅ Spring Security hat Request durchgelassen
✅ JWT wurde erfolgreich validiert
✅ User wurde authentifiziert
✅ Request erreichte DispatcherServlet
✅ Problem: KEIN Controller gefunden

// 3. Bei Security-Problemen würden Sie bekommen:
❌ HTTP 401 Unauthorized (kein/ungültiger Token)
❌ HTTP 403 Forbidden (keine Berechtigung)

// 4. HTTP 500 bedeutet:
Das Problem liegt in der Handler-Auflösung, NICHT in Security!
```

### Reihenfolge der Fehler:

```
1. Kein JWT Token         → HTTP 401 (von JwtAuthenticationFilter)
2. Ungültiger Token       → HTTP 401 (von JwtAuthenticationFilter)
3. Token OK, keine Rolle  → HTTP 403 (von FilterSecurityInterceptor)
4. Alles OK, kein Handler → HTTP 500 (von ResourceHttpRequestHandler)
                            ^^^^^^^^^^^^ IHR PROBLEM!
```

---

## 4. HTTP 404 statt 500 mit @ControllerAdvice

### Lösung: GlobalExceptionHandler

```java
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Fängt NoResourceFoundException ab
     * Gibt HTTP 404 statt 500 zurück
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(
            NoResourceFoundException ex) {
        
        Map<String, Object> error = new HashMap<>();
        error.put("timestamp", LocalDateTime.now().toString());
        error.put("status", 404);
        error.put("error", "Not Found");
        error.put("message", "Endpoint does not exist: " + ex.getResourcePath());
        error.put("path", ex.getResourcePath());
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}
```

**Resultat:**
- Vorher: HTTP 500 "No static resource..."
- Nachher: HTTP 404 "Endpoint does not exist"

---

## 5. Zwei korrekte Lösungen

### Lösung A: Fehlender Controller (Beispiel Problem)

```java
// ❌ FALSCH: Kein Controller für diese URL
// Request zu /api/public/customer/orders kommt an
// Kein @RestController mit @GetMapping("/orders")
// → Spring behandelt als statische Ressource
// → HTTP 500 NoResourceFoundException

// FEHLT:
@RestController
@RequestMapping("/api/public/customer")
public class CustomerOrderController {
    @GetMapping("/orders")
    public ResponseEntity<?> getOrders() {
        // Handler-Code
    }
}
```

### Lösung B: Korrekter Controller (Ihre aktuelle Implementierung)

```java
// ✅ RICHTIG: Controller existiert und ist korrekt
@RestController
@RequestMapping("/api/public/customer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomerOrderController {

    private final OrderService orderService;

    @GetMapping("/orders")
    public ResponseEntity<?> getCustomerOrders() {
        Authentication auth = SecurityContextHolder
            .getContext()
            .getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401)
                .body(Map.of("error", "Not authenticated"));
        }

        User user = (User) auth.getPrincipal();
        List<Order> orders = orderService.getOrdersByCustomer(user.getId());

        return ResponseEntity.ok(orders);
    }
}
```

---

## 6. Häufige Ursachen für "Controller nicht gefunden"

### Checkliste:

```java
// 1. ✅ Controller ist in richtigem Package
package storebackend.controller;  // ✅ Richtig
package com.other.package;         // ❌ Falsch (außerhalb Component Scan)

// 2. ✅ @RestController Annotation vorhanden
@RestController                    // ✅
public class MyController          // ❌ Fehlt Annotation

// 3. ✅ @RequestMapping korrekt
@RequestMapping("/api/public/customer")  // ✅
@RequestMapping("api/public/customer")   // ⚠️  Funktioniert, aber ohne /
@RequestMapping("")                      // ❌ Leer

// 4. ✅ @GetMapping korrekt
@GetMapping("/orders")             // ✅
@GetMapping("orders")              // ✅ Auch OK (relativ)
@PostMapping("/orders")            // ❌ Falsche HTTP-Methode

// 5. ✅ Component Scan deckt Package ab
@SpringBootApplication             // Scannt storebackend.*
package storebackend;              // ✅ Controller in storebackend.controller

// 6. ✅ Keine @Profile die nicht aktiv ist
@Profile("dev")                    // ❌ Wenn 'dev' nicht aktiv
// oder keine @Profile             // ✅ Immer aktiv
```

---

## 7. Debugging-Schritte

### 1. Prüfen Sie Startup-Logs:

```
Mapped "{[/api/public/customer/orders],methods=[GET]}" 
    onto public org.springframework.http.ResponseEntity 
    storebackend.controller.CustomerOrderController.getCustomerOrders()
```

**Wenn diese Zeile FEHLT → Controller wird nicht erkannt!**

### 2. Aktivieren Sie Debug-Logging:

```yaml
# application.yml
logging:
  level:
    org.springframework.web: DEBUG
    org.springframework.web.servlet.mvc.method.annotation: TRACE
```

### 3. Prüfen Sie zur Laufzeit:

```java
@RestController
public class DebugController {
    
    @Autowired
    private RequestMappingHandlerMapping handlerMapping;
    
    @GetMapping("/debug/mappings")
    public Map<String, String> getMappings() {
        return handlerMapping.getHandlerMethods().entrySet().stream()
            .collect(Collectors.toMap(
                e -> e.getKey().toString(),
                e -> e.getValue().toString()
            ));
    }
}
```

---

## 8. Ihr spezifischer Fall

### Aktuelle Situation:

```java
// Ihr Controller existiert und sieht korrekt aus:
@RestController
@RequestMapping("/api/public/customer")
public class CustomerOrderController {
    @GetMapping("/orders")
    public ResponseEntity<?> getCustomerOrders() { ... }
}
```

### Mögliche Ursachen in Ihrem Fall:

1. **Controller wird nicht kompiliert**
   - Lösung: `mvn clean compile`

2. **Controller-Datei ist leer/korrupt**
   - Lösung: Datei neu erstellen

3. **Spring Context startet Controller nicht**
   - Lösung: Startup-Logs prüfen

4. **Alte .class Dateien im target/ Ordner**
   - Lösung: `mvn clean` ausführen

### Empfohlene Aktionen:

```bash
# 1. Clean Build
mvn clean package -DskipTests

# 2. Backend neu starten
java -jar target/store-backend.jar

# 3. Startup-Logs prüfen auf:
# "Mapped "{[/api/public/customer/orders]"

# 4. Test mit curl:
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/api/public/customer/orders
```

---

## Zusammenfassung

| Problem | Ursache | Lösung |
|---------|---------|--------|
| HTTP 500 "No static resource" | Kein Controller mapped URL | Controller erstellen/reparieren |
| HTTP 500 wird zu 404 | Mit GlobalExceptionHandler | @ControllerAdvice hinzufügen |
| Controller existiert, aber 500 | Build-Problem | `mvn clean compile` |
| Security wirft 401/403 | JWT/Auth-Problem | Token/Security prüfen |

**Wichtig:** HTTP 500 "No static resource" = **Handler-Mapping-Problem**, NICHT Security!

