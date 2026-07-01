package com.SP.SecurityPassword.Repository;

import com.SP.SecurityPassword.Entity.User;
import com.SP.SecurityPassword.Enum.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByUserName(String userName);

    Optional<User> findByEmail(String email);

    boolean existsByUserName(String userName);

    boolean existsByEmail(String email);

    List<User> findByRole(Role role);

    List<User> findByIsActive(Boolean isActive);
}