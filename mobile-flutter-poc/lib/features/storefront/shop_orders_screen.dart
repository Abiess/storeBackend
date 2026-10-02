import 'package:flutter/material.dart';
import 'shop_orders_service.dart';

class ShopOrdersScreen extends StatefulWidget {
  const ShopOrdersScreen({super.key, required this.storeId,
    required this.currencyCode, this.service});
  final int storeId;
  final String currencyCode;
  final ShopOrdersService? service;
  @override
  State<ShopOrdersScreen> createState() => _ShopOrdersScreenState();
}

class _ShopOrdersScreenState extends State<ShopOrdersScreen> {
  late final ShopOrdersService _service;
  List<ShopOrderSummary> _orders = const [];
  bool _loading = true;
  String? _error;
  @override
  void initState() {
    super.initState();
    _service = widget.service ?? ShopOrdersService();
    _load();
  }
  @override
  void dispose() {
    if (widget.service == null) _service.close();
    super.dispose();
  }
  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final orders = await _service.loadOrders(widget.storeId);
      if (!mounted) return;
      setState(() => _orders = orders);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error is ShopOrdersException
          ? error.message : 'Bestellungen konnten nicht geladen werden.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Meine Bestellungen'), actions: [
      IconButton(tooltip: 'Bestellungen aktualisieren',
        onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
    ]),
    body: _loading ? const Center(child: CircularProgressIndicator())
      : _error != null ? Center(child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(_error!, textAlign: TextAlign.center),
            TextButton(onPressed: _load, child: const Text('Erneut laden')),
          ])))
      : _orders.isEmpty ? const Center(child: Text('Noch keine Bestellungen in diesem Shop.'))
      : RefreshIndicator(onRefresh: _load, child: ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          itemCount: _orders.length,
          separatorBuilder: (_, __) => const Divider(height: 1),
          itemBuilder: (context, index) {
            final order = _orders[index];
            final date = order.createdAt;
            final dateLabel = date == null ? '' :
                '${date.day.toString().padLeft(2, '0')}.${date.month.toString().padLeft(2, '0')}.${date.year} · ';
            return ListTile(
              title: Text(order.orderNumber),
              subtitle: Text('$dateLabel${order.statusLabel}\n${order.itemCount} Artikel'),
              isThreeLine: true,
              trailing: Text('${order.totalAmount.toStringAsFixed(2).replaceAll('.', ',')} ${widget.currencyCode}'),
            );
          },
        )),
  );
}
