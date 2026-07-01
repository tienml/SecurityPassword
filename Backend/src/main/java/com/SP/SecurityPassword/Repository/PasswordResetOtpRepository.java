package com.SP.SecurityPassword.Repository;

import com.SP.SecurityPassword.Entity.PasswordResetOtp;
import com.SP.SecurityPassword.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Integer> {

    Optional<PasswordResetOtp> findTopByUserAndIsUsedFalseAndExpiresAtAfterOrderByCreatedAtDesc(
            User user,
            LocalDateTime now
    );

    List<PasswordResetOtp> findByUserOrderByCreatedAtDesc(User user);
}