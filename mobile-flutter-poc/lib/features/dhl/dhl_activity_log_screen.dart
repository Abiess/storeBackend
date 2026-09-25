import 'package:flutter/material.dart';

import '../../models/dhl_activity_log.dart';
import '../../services/dhl_service.dart';

/// Read-only, store-scoped audit trail. Filters and pagination are evaluated
/// by the backend, as in the Angular activity log.
class DhlActivityLogScreen extends StatefulWidget {
  const DhlActivityLogScreen({super.key, required this.storeId, this.dhlService});

  final int storeId;
  final DhlService? dhlService;

  @override
  State<DhlActivityLogScreen> createState() => _DhlActivityLogScreenState();
}

class _DhlActivityLogScreenState extends State<DhlActivityLogScreen> {
  late final DhlService _service = widget.dhlService ?? DhlService();
  DhlActivityLogPage? _result;
  Object? _error;
  bool _loading = false;
  bool _today = false;
  String? _action;
  int _page = 0;
  int _generation = 0;

  static const _actions = <String, String>{
    'STORED': 'Eingelagert',
    'FOUND': 'Gefunden',
    'PICKED_UP': 'Ausgegeben',
    'SCAN_FAILED': 'Scan fehlgeschlagen',
    'MANUAL_SEARCH': 'Manuell gesucht',
    'STORAGE_CANCELLED': 'Einlagerung storniert',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _service.getActivityLog(
        widget.storeId, page: _page, size: 20, today: _today, action: _action,
      );
      if (!mounted || generation != _generation) return;
      setState(() => _result = result);
    } catch (error) {
      if (!mounted || generation != _generation) return;
      setState(() => _error = error);
    } finally {
      if (mounted && generation == _generation) setState(() => _loading = false);
    }
  }

  void _filterChanged() {
    _page = 0;
    _result = null;
    _load();
  }

  void _changePage(int page) {
    _page = page;
    _result = null;
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    return Scaffold(
      appBar: AppBar(title: const Text('Aktivitätsprotokoll'), actions: [
        IconButton(tooltip: 'Aktualisieren', onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
      ]),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1000),
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Wrap(spacing: 16, runSpacing: 8, crossAxisAlignment: WrapCrossAlignment.center, children: [
                FilterChip(label: const Text('Nur heute'), selected: _today, onSelected: (value) {
                  _today = value;
                  _filterChanged();
                }),
                SizedBox(width: 220, child: DropdownButtonFormField<String>(
                  key: const ValueKey('dhlLog.action'),
                  initialValue: _action,
                  decoration: const InputDecoration(labelText: 'Aktion', isDense: true),
                  items: [
                    const DropdownMenuItem<String>(value: null, child: Text('Alle Aktionen')),
                    for (final entry in _actions.entries)
                      DropdownMenuItem(value: entry.key, child: Text(entry.value)),
                  ],
                  onChanged: (value) {
                    _action = value;
                    _filterChanged();
                  },
                )),
              ]),
            ),
            if (_loading) const LinearProgressIndicator(),
            Expanded(child: _error != null
                ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Text('Aktivitäten konnten nicht geladen werden.'),
                    TextButton(onPressed: _load, child: const Text('Erneut versuchen')),
                  ]))
                : result == null
                    ? const Center(child: CircularProgressIndicator())
                    : result.content.isEmpty
                        ? const Center(child: Text('Keine Aktivitäten gefunden'))
                        : ListView.separated(
                            itemCount: result.content.length,
                            separatorBuilder: (context, index) => const Divider(height: 1),
                            itemBuilder: (context, index) => _activityTile(result.content[index]),
                          )),
            if (result != null && _error == null && result.totalPages > 1)
              Padding(padding: const EdgeInsets.all(12), child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(tooltip: 'Vorherige Seite', onPressed: _loading || _page == 0 ? null : () => _changePage(_page - 1), icon: const Icon(Icons.chevron_left)),
                  Text('Seite ${result.number + 1} von ${result.totalPages}'),
                  IconButton(tooltip: 'Nächste Seite', onPressed: _loading || _page >= result.totalPages - 1 ? null : () => _changePage(_page + 1), icon: const Icon(Icons.chevron_right)),
                ],
              )),
          ]),
        ),
      ),
    );
  }

  Widget _activityTile(DhlActivityLog activity) {
    final time = activity.createdAt?.toLocal();
    final dateLabel = time == null ? '–' : '${time.day.toString().padLeft(2, '0')}.${time.month.toString().padLeft(2, '0')}.${time.year} ${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
    return ListTile(
      title: Text('${_actions[activity.action] ?? activity.action}: ${activity.trackingCode}'),
      subtitle: Text([
        dateLabel,
        if (activity.slotSnapshot?.isNotEmpty == true) 'Lagerplatz ${activity.slotSnapshot}',
        if (activity.userEmail?.isNotEmpty == true) activity.userEmail!,
        if (activity.failureReason?.isNotEmpty == true) activity.failureReason!,
      ].join(' · ')),
    );
  }
}
