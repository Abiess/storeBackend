import 'package:flutter/material.dart';

/// Login-only entry for stores whose customer accounts are provisioned by an admin.
class ShopCustomerLoginScreen extends StatefulWidget {
  const ShopCustomerLoginScreen({
    super.key,
    required this.storeName,
    required this.onLogin,
  });

  final String storeName;
  final Future<void> Function(String identifier, String password) onLogin;

  @override
  State<ShopCustomerLoginScreen> createState() => _ShopCustomerLoginScreenState();
}

class _ShopCustomerLoginScreenState extends State<ShopCustomerLoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;
    if (_identifier.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Bitte Kunden-ID oder Telefonnummer und Passwort eingeben.');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await widget.onLogin(_identifier.text.trim(), _password.text);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F7),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                color: colors.surface,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                  side: BorderSide(color: colors.outlineVariant),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Center(
                        child: CircleAvatar(
                          radius: 32,
                          backgroundColor: colors.primaryContainer,
                          child: Icon(Icons.storefront_outlined, size: 30, color: colors.onPrimaryContainer),
                        ),
                      ),
                      const SizedBox(height: 20),
                      Text(widget.storeName, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 6),
                      Text('Anmelden', textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text('Melde dich mit den Zugangsdaten an, die du vom Store erhalten hast.', textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colors.onSurfaceVariant)),
                      const SizedBox(height: 24),
                      TextField(
                        key: const ValueKey('shop-login-identifier'),
                        controller: _identifier,
                        enabled: !_loading,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.username, AutofillHints.telephoneNumber],
                        decoration: const InputDecoration(labelText: 'Kunden-ID oder Telefonnummer', prefixIcon: Icon(Icons.person_outline), border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        key: const ValueKey('shop-login-password'),
                        controller: _password,
                        enabled: !_loading,
                        obscureText: _obscurePassword,
                        onSubmitted: (_) => _submit(),
                        autofillHints: const [AutofillHints.password],
                        decoration: InputDecoration(
                          labelText: 'Passwort',
                          prefixIcon: const Icon(Icons.lock_outline),
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            tooltip: _obscurePassword ? 'Passwort anzeigen' : 'Passwort verbergen',
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                          ),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Text(_error!, key: const ValueKey('shop-login-error'), style: TextStyle(color: colors.error), textAlign: TextAlign.center),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(
                        key: const ValueKey('shop-login-submit'),
                        onPressed: _loading ? null : _submit,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: _loading ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Anmelden'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
