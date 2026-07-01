package com.SP.SecurityPassword.Repository;

import com.SP.SecurityPassword.Entity.PasswordChangeLog;
import com.SP.SecurityPassword.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PasswordChangeLogRepository extends JpaRepository<PasswordChangeLog, Integer> {

    List<PasswordChangeLog> findByUserOrderByCreatedAtDesc(User user);

    List<PasswordChangeLog> findTop50ByOrderByCreatedAtDesc();
}