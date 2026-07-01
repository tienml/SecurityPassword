package com.SP.SecurityPassword.Controller;

import com.SP.SecurityPassword.DTO.Common.ApiResponse;
import com.SP.SecurityPassword.DTO.Reponse.*;
import com.SP.SecurityPassword.Service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ApiResponse<List<UserResponse>> getAllUsers() {
        return ApiResponse.success(
                "Lấy danh sách user thành công",
                adminService.getAllUsers()
        );
    }

    @GetMapping("/login-logs")
    public ApiResponse<List<LoginLogResponse>> getLoginLogs() {
        return ApiResponse.success(
                "Lấy login logs thành công",
                adminService.getLoginLogs()
        );
    }

    @GetMapping("/sessions")
    public ApiResponse<List<SessionResponse>> getSessions() {
        return ApiResponse.success(
                "Lấy danh sách session thành công",
                adminService.getSessions()
        );
    }

    @GetMapping("/password-change-logs")
    public ApiResponse<List<PasswordChangeLogResponse>> getPasswordChangeLogs() {
        return ApiResponse.success(
                "Lấy password change logs thành công",
                adminService.getPasswordChangeLogs()
        );
    }
}