class DhlActivityLog {
  const DhlActivityLog({
    required this.action,
    required this.trackingCode,
    this.slotSnapshot,
    this.createdAt,
  });

  final String action;
  final String trackingCode;
  final String? slotSnapshot;
  final DateTime? createdAt;

  factory DhlActivityLog.fromJson(Map<String, dynamic> json) => DhlActivityLog(
        action: json['action'] as String? ?? '',
        trackingCode: json['trackingCode'] as String? ?? '',
        slotSnapshot: json['slotSnapshot'] as String?,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
      );
}

class DhlActivityLogPage {
  const DhlActivityLogPage({required this.content, required this.totalElements});

  final List<DhlActivityLog> content;
  final int totalElements;

  factory DhlActivityLogPage.fromJson(Map<String, dynamic> json) => DhlActivityLogPage(
        content: (json['content'] as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map(DhlActivityLog.fromJson)
            .toList(),
        totalElements: (json['totalElements'] as num).toInt(),
      );
}
