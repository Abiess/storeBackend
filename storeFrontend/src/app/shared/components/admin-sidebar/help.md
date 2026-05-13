// Tab komplett ausblenden:
{ icon: '⭐', label: '...', route: ..., visible: false }

// Tab nur für Beta-User:
{ icon: '🤖', label: '...', route: ..., beta: true }

// Im Browser-Console eingeben um Beta zu aktivieren:
localStorage.setItem('betaAccess', 'true');

// Beta deaktivieren:
localStorage.removeItem('betaAccess');
