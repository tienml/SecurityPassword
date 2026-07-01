package com.SP.SecurityPassword.Service;

import com.SP.SecurityPassword.DTO.Request.*;
import com.SP.SecurityPassword.DTO.Reponse.*;
import com.SP.SecurityPassword.Entity.*;
import com.SP.SecurityPassword.Enum.HashAlgorithm;
import com.SP.SecurityPassword.Enum.Role;
import com.SP.SecurityPassword.Repository.*;
import com.SP.SecurityPassword.Config.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final LoginLogRepository loginLogRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final UserSessionRepository userSessionRepository;
    private final PasswordChangeLogRepository passwordChangeLogRepository;

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.security.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${app.security.lock-duration-minutes:5}")
    private int lockDurationMinutes;

    @Value("${app.security.otp-expiration-minutes:10}")
    private int otpExpirationMinutes;

    @Value("${app.security.max-otp-failed-attempts:5}")
    private int maxOtpFailedAttempts;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUserName(request.getUserName())) {
            throw new IllegalArgumentException("Username đã tồn tại");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại");
        }

        User user = User.builder()
                .userName(request.getUserName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .hashAlgorithm(HashAlgorithm.BCRYPT)
                .role(Role.USER)
                .failedAttempts(0)
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);

        return mapToUserResponse(savedUser);
    }

    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String loginIdentifier = request.getLoginIdentifier();

        User user = findByUsernameOrEmail(loginIdentifier);

        if (user == null) {
            saveLoginLog(null, loginIdentifier, false, "USER_NOT_FOUND", httpRequest);
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không đúng");
        }

        if (Boolean.FALSE.equals(user.getIsActive())) {
            saveLoginLog(user, loginIdentifier, false, "ACCOUNT_INACTIVE", httpRequest);
            throw new IllegalArgumentException("Tài khoản đã bị vô hiệu hóa");
        }

        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            saveLoginLog(user, loginIdentifier, false, "ACCOUNT_LOCKED", httpRequest);
            throw new IllegalArgumentException("Tài khoản đang bị khóa tạm thời");
        }

        boolean passwordMatches = passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        );

        if (!passwordMatches) {
            handleFailedLogin(user, loginIdentifier, httpRequest);
            throw new IllegalArgumentException("Tài khoản hoặc mật khẩu không đúng");
        }

        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String jwtId = jwtUtil.generateJwtId();
        String token = jwtUtil.generateToken(user, jwtId);

        UserSession session = UserSession.builder()
                .user(user)
                .jwtId(jwtId)
                .tokenHash(null)
                .isActive(true)
                .expiresAt(LocalDateTime.now().plus(jwtUtil.getJwtExpiration(), ChronoUnit.MILLIS))
                .build();

        userSessionRepository.save(session);

        saveLoginLog(user, loginIdentifier, true, "LOGIN_SUCCESS", httpRequest);

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getJwtExpiration())
                .userId(user.getId())
                .userName(user.getUserName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    @Transactional
    public void changePassword(User currentUser, ChangePasswordRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));

        boolean currentPasswordMatches = passwordEncoder.matches(
                request.getCurrentPassword(),
                user.getPasswordHash()
        );

        if (!currentPasswordMatches) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }

        boolean newPasswordSameAsOld = passwordEncoder.matches(
                request.getNewPassword(),
                user.getPasswordHash()
        );

        if (newPasswordSameAsOld) {
            throw new IllegalArgumentException("Mật khẩu mới không được trùng mật khẩu hiện tại");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        revokeAllActiveSessions(user, "PASSWORD_CHANGED");

        savePasswordChangeLog(
                user,
                "CHANGE_PASSWORD",
                "User changed password",
                httpRequest
        );
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại trong hệ thống"));

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);

        PasswordResetOtp passwordResetOtp = PasswordResetOtp.builder()
                .user(user)
                .otpHash(otpHash)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .isUsed(false)
                .failedAttempts(0)
                .build();

        passwordResetOtpRepository.save(passwordResetOtp);

        emailService.sendOtpEmail(user.getEmail(), otp);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Email không tồn tại trong hệ thống"));

        PasswordResetOtp otpRecord = passwordResetOtpRepository
                .findTopByUserAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(user, LocalDateTime.now())
                .orElseThrow(() -> new IllegalArgumentException("OTP không tồn tại hoặc đã hết hạn"));

        if (otpRecord.getFailedAttempts() >= maxOtpFailedAttempts) {
            throw new IllegalArgumentException("OTP đã nhập sai quá nhiều lần");
        }

        boolean otpMatches = passwordEncoder.matches(
                request.getOtp(),
                otpRecord.getOtpHash()
        );

        if (!otpMatches) {
            otpRecord.setFailedAttempts(otpRecord.getFailedAttempts() + 1);
            passwordResetOtpRepository.save(otpRecord);
            throw new IllegalArgumentException("OTP không đúng");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        otpRecord.setIsUsed(true);
        otpRecord.setUsedAt(LocalDateTime.now());
        passwordResetOtpRepository.save(otpRecord);

        revokeAllActiveSessions(user, "PASSWORD_RESET");

        savePasswordChangeLog(
                user,
                "RESET_PASSWORD",
                "Password reset by OTP",
                httpRequest
        );
    }

    public UserResponse getMe(User currentUser) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));

        return mapToUserResponse(user);
    }

    private void handleFailedLogin(User user, String loginIdentifier, HttpServletRequest httpRequest) {
        int failedAttempts = user.getFailedAttempts() == null ? 0 : user.getFailedAttempts();
        failedAttempts++;

        user.setFailedAttempts(failedAttempts);

        if (failedAttempts >= maxFailedAttempts) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(lockDurationMinutes));
        }

        userRepository.save(user);

        saveLoginLog(user, loginIdentifier, false, "WRONG_PASSWORD", httpRequest);
    }

    private void revokeAllActiveSessions(User user, String reason) {
        userSessionRepository.findByUserAndIsActiveTrue(user)
                .forEach(session -> {
                    session.setIsActive(false);
                    session.setRevokedAt(LocalDateTime.now());
                    session.setRevokedReason(reason);
                    userSessionRepository.save(session);
                });
    }

    private void saveLoginLog(
            User user,
            String loginIdentifier,
            Boolean success,
            String reason,
            HttpServletRequest request
    ) {
        LoginLog loginLog = LoginLog.builder()
                .user(user)
                .userName(loginIdentifier)
                .success(success)
                .reason(reason)
                .ipAddress(getClientIp(request))
                .userAgent(request.getHeader("User-Agent"))
                .build();

        loginLogRepository.save(loginLog);
    }

    private void savePasswordChangeLog(
            User user,
            String changeType,
            String note,
            HttpServletRequest request
    ) {
        PasswordChangeLog log = PasswordChangeLog.builder()
                .user(user)
                .changeType(changeType)
                .note(note)
                .ipAddress(getClientIp(request))
                .userAgent(request.getHeader("User-Agent"))
                .build();

        passwordChangeLogRepository.save(log);
    }

    private User findByUsernameOrEmail(String loginIdentifier) {
        if (loginIdentifier.contains("@")) {
            return userRepository.findByEmail(loginIdentifier).orElse(null);
        }

        return userRepository.findByUserName(loginIdentifier).orElse(null);
    }

    private String generateOtp() {
        int number = secureRandom.nextInt(1_000_000);
        return String.format("%06d", number);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");

        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
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
}