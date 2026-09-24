/// Schlankes Flutter-Gegenstueck zu DhlShelfSlotDto fuer die manuelle
/// Lagerplatz-Auswahl im DHL-Einlagerungsflow.
class DhlSlotDto {
  const DhlSlotDto({
    required this.id,
    required this.code,
    required this.capacity,
    required this.sortOrder,
    required this.active,
    required this.occupiedCount,
    this.description,
  });

  final int id;
  final String code;
  final int capacity;
  final int sortOrder;
  final bool active;
  final int occupiedCount;
  final String? description;

  bool get isFull => occupiedCount >= capacity;
  bool get isSelectable => active && !isFull;

  factory DhlSlotDto.fromJson(Map<String, dynamic> json) => DhlSlotDto(
        id: (json['id'] as num?)?.toInt() ?? 0,
        code: json['code'] as String? ?? '-',
        capacity: (json['capacity'] as num?)?.toInt() ?? 1,
        sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
        active: json['active'] as bool? ?? false,
        occupiedCount: (json['occupiedCount'] as num?)?.toInt() ?? 0,
        description: json['description'] as String?,
      );
}
