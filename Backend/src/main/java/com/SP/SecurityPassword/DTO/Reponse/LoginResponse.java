package com.SP.SecurityPassword.DTO.Reponse;

import com.SP.SecurityPassword.Enum.Role;
import lombok.*;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class LoginResponse {

    private String token;
    private String tokenType;
    private Long expiresIn;
    private Integer userId;
    private String userName;
    private String email;
    private Role role;
}