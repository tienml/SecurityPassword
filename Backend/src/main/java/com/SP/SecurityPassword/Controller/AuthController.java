package com.SP.SecurityPassword.Controller;

import com.SP.SecurityPassword.DTO.Common.ApiResponse;
import com.SP.SecurityPassword.DTO.Request.*;
import com.SP.SecurityPassword.DTO.Reponse.LoginResponse;
import com.SP.SecurityPassword.DTO.Reponse.UserResponse;
import com.SP.SecurityPassword.Entity.User;
import com.SP.SecurityPassword.Service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ApiResponse.success("Đăng ký tài khoản thành công", response);
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request, httpRequest);
        return ApiResponse.success("Đăng nhập thành công", response);
    }

    @PostMapping("/change-password")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.changePassword(currentUser, request, httpRequest);
        return ApiResponse.success("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.success("OTP đã được gửi về email", null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        authService.resetPassword(request, httpRequest);
        return ApiResponse.success("Đặt lại mật khẩu thành công", null);
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal User currentUser) {
        UserResponse response = authService.getMe(currentUser);
        return ApiResponse.success("Lấy thông tin tài khoản thành công", response);
    }
}