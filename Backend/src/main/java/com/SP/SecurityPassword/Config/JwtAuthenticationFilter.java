package com.SP.SecurityPassword.Config;

import com.SP.SecurityPassword.Entity.User;
import com.SP.SecurityPassword.Entity.UserSession;
import com.SP.SecurityPassword.Repository.UserRepository;
import com.SP.SecurityPassword.Repository.UserSessionRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final UserSessionRepository userSessionRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            if (jwtUtil.isTokenExpired(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            String username = jwtUtil.extractUsername(token);
            Integer userId = jwtUtil.extractUserId(token);
            String jwtId = jwtUtil.extractJwtId(token);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                Optional<User> userOptional = userRepository.findById(userId);

                if (userOptional.isEmpty()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                User user = userOptional.get();

                if (Boolean.FALSE.equals(user.getIsActive())) {
                    filterChain.doFilter(request, response);
                    return;
                }

                Optional<UserSession> sessionOptional =
                        userSessionRepository.findByJwtIdAndIsActiveTrue(jwtId);

                if (sessionOptional.isEmpty()) {
                    filterChain.doFilter(request, response);
                    return;
                }

                UserSession session = sessionOptional.get();

                if (session.getExpiresAt().isBefore(LocalDateTime.now())) {
                    filterChain.doFilter(request, response);
                    return;
                }

                if (!session.getUser().getId().equals(user.getId())) {
                    filterChain.doFilter(request, response);
                    return;
                }

                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + user.getRole().name())
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                user,
                                null,
                                authorities
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

        } catch (Exception e) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }
}