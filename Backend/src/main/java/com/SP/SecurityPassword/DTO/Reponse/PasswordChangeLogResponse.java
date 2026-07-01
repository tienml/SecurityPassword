package com.SP.SecurityPassword.DTO.Reponse;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class PasswordChangeLogResponse {

    private Integer id;
    private Integer userId;
    private String userName;
    private String changeType;
    private String note;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;
}