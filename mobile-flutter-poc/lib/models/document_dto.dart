/// Spiegelt 1:1 `DocumentDTO.java` (storebackend.dto), exakte Feldnamen
/// wie vom Backend geliefert (camelCase JSON, wie von Jackson/Angular
/// bereits genutzt - keine eigene Umbenennung).
class DocumentDto {
  final int id;
  final int ownerUserId;
  final String? ownerEmail;
  final String title;
  final String? category;
  final String? note;
  final String? documentDate; // ISO yyyy-MM-dd, bewusst als String belassen (PoC)
  final String? expiryDate;
  final bool hasFile;
  final String? originalFilename;
  final String? mimeType;
  final int? size;
  final String? createdAt;
  final String? updatedAt;
  final bool sharedWithMe;
  final String? permission;

  DocumentDto({
    required this.id,
    required this.ownerUserId,
    this.ownerEmail,
    required this.title,
    this.category,
    this.note,
    this.documentDate,
    this.expiryDate,
    required this.hasFile,
    this.originalFilename,
    this.mimeType,
    this.size,
    this.createdAt,
    this.updatedAt,
    this.sharedWithMe = false,
    this.permission,
  });

  factory DocumentDto.fromJson(Map<String, dynamic> json) {
    return DocumentDto(
      id: (json['id'] as num?)?.toInt() ?? 0,
      ownerUserId: (json['ownerUserId'] as num?)?.toInt() ?? 0,
      ownerEmail: json['ownerEmail'] as String?,
      title: json['title'] as String? ?? '(ohne Titel)',
      category: json['category'] as String?,
      note: json['note'] as String?,
      documentDate: json['documentDate'] as String?,
      expiryDate: json['expiryDate'] as String?,
      hasFile: json['hasFile'] as bool? ?? false,
      originalFilename: json['originalFilename'] as String?,
      mimeType: json['mimeType'] as String?,
      size: (json['size'] as num?)?.toInt(),
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      sharedWithMe: json['sharedWithMe'] as bool? ?? false,
      permission: json['permission'] as String?,
    );
  }
}
