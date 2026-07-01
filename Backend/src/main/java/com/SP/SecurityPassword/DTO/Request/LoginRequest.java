package com.SP.SecurityPassword.DTO.Request;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @AllArgsConstructor @NoArgsConstructor @Builder
public class LoginRequest {

    @NotBlank(message = "Username hoặc email không được để trống")
    private String loginIdentifier;

    @NotBlank(message = "Password không được để trống")
    private String password;
}