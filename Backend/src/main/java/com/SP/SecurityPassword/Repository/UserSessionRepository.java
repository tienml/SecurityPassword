package com.SP.SecurityPassword.Repository;

import com.SP.SecurityPassword.Entity.User;
import com.SP.SecurityPassword.Entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Integer> {

    Optional<UserSession> findByJwtIdAndIsActiveTrue(String jwtId);

    List<UserSession> findByUserAndIsActiveTrue(User user);

    List<UserSession> findByUser(User user);
}