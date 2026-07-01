package com.SP.SecurityPassword.Service;

import com.SP.SecurityPassword.DTO.Reponse.*;
import com.SP.SecurityPassword.Entity.*;
import com.SP.SecurityPassword.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final LoginLogRepository loginLogRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordChangeLogRepository passwordChangeLogRepository;

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToUserResponse)
                .toList();
    }

    public List<LoginLogResponse> getLoginLogs() {
        return loginLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToLoginLogResponse)
                .toList();
    }

    public List<SessionResponse> getSessions() {
        return userSessionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToSessionResponse)
                .toList();
    }

    public List<PasswordChangeLogResponse> getPasswordChangeLogs() {
        return passwordChangeLogRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::mapToPasswordChangeLogResponse)
                .toList();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .userName(user.getUserName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .failedAttempts(user.getFailedAttempts())
                .lockedUntil(user.getLockedUntil())
                .lastLoginAt(user.getLastLoginAt())
                .passwordChangedAt(user.getPasswordChangedAt())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private LoginLogResponse mapToLoginLogResponse(LoginLog log) {
        return LoginLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userName(log.getUserName())
                .success(log.getSuccess())
                .reason(log.getReason())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt())
                .build();
    }

    private SessionResponse mapToSessionResponse(UserSession session) {
        return SessionResponse.builder()
                .id(session.getId())
                .userId(session.getUser().getId())
                .userName(session.getUser().getUserName())
                .jwtId(session.getJwtId())
                .isActive(session.getIsActive())
                .createdAt(session.getCreatedAt())
                .expiresAt(session.getExpiresAt())
                .revokedAt(session.getRevokedAt())
                .revokedReason(session.getRevokedReason())
                .build();
    }

    private PasswordChangeLogResponse mapToPasswordChangeLogResponse(PasswordChangeLog log) {
        return PasswordChangeLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser().getId())
                .userName(log.getUser().getUserName())
                .changeType(log.getChangeType())
                .note(log.getNote())
                .ipAddress(log.getIpAddress())
                .userAgent(log.getUserAgent())
                .createdAt(log.getCreatedAt())
                .build();
    }
}