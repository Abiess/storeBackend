package storebackend.dto;

import java.time.LocalDateTime;

/** DTO für Team-Einladungs-Antworten */
public class TeamInvitationDTO {
    public Long id;
    public Long storeId;
    public String storeName;
    public String email;
    public String role;
    public String status;
    public Long invitedByUserId;
    public String invitedByUserName;
    public LocalDateTime createdAt;
    public LocalDateTime expiresAt;
    public LocalDateTime acceptedAt;
    public LocalDateTime revokedAt;
}
