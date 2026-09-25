class DhlActivityLog {
  const DhlActivityLog({
    required this.action,
    required this.trackingCode,
    this.slotSnapshot,
    this.createdAt,
    this.userEmail,
    this.failureReason,
  });

  final String action;
  final String trackingCode;
  final String? slotSnapshot;
  final DateTime? createdAt;
  final String? userEmail;
  final String? failureReason;

  factory DhlActivityLog.fromJson(Map<String, dynamic> json) => DhlActivityLog(
        action: json['action'] as String? ?? '',
        trackingCode: json['trackingCode'] as String? ?? '',
        slotSnapshot: json['slotSnapshot'] as String?,
        createdAt: DateTime.tryParse(json['createdAt'] as String? ?? ''),
        userEmail: json['userEmail'] as String?,
        failureReason: json['failureReason'] as String?,
      );
}

class DhlActivityLogPage {
  const DhlActivityLogPage({required this.content, required this.totalElements, this.number = 0, this.totalPages = 1});

  final List<DhlActivityLog> content;
  final int totalElements;
  final int number;
  final int totalPages;

  factory DhlActivityLogPage.fromJson(Map<String, dynamic> json) => DhlActivityLogPage(
        content: (json['content'] as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map(DhlActivityLog.fromJson)
            .toList(),
        totalElements: (json['totalElements'] as num).toInt(),
        number: (json['number'] as num?)?.toInt() ?? 0,
        totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
      );
}
