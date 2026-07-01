package com.SP.SecurityPassword.Repository;

import com.SP.SecurityPassword.Entity.LoginLog;
import com.SP.SecurityPassword.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoginLogRepository extends JpaRepository<LoginLog, Integer> {

    List<LoginLog> findByUser(User user);

    List<LoginLog> findByUserName(String userName);

    List<LoginLog> findBySuccess(Boolean success);

    List<LoginLog> findTop50ByOrderByCreatedAtDesc();
}