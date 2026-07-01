package com.SP.SecurityPassword.DTO.Reponse;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class SessionResponse {

    private Integer id;
    private Integer userId;
    private String userName;
    private String jwtId;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime revokedAt;
    private String revokedReason;
}