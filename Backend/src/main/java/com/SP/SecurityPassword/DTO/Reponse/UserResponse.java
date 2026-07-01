package com.SP.SecurityPassword.DTO.Reponse;

import com.SP.SecurityPassword.Enum.Role;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class UserResponse {

    private Integer id;
    private String userName;
    private String email;
    private Role role;
    private Boolean isActive;
    private Integer failedAttempts;
    private LocalDateTime lockedUntil;
    private LocalDateTime lastLoginAt;
    private LocalDateTime passwordChangedAt;
    private LocalDateTime createdAt;
}