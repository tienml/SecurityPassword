-- ===============================
-- CREATE DATABASE
-- ===============================
IF DB_ID('AuthSystem') IS NULL
BEGIN
    CREATE DATABASE AuthSystem;
END
GO

USE AuthSystem;
GO


-- ===============================
-- 1. USERS TABLE
-- Lưu tài khoản người dùng và admin
-- ===============================
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,

    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,

    password_hash NVARCHAR(500) NOT NULL,
    hash_algorithm NVARCHAR(50) NOT NULL DEFAULT 'BCRYPT',

    role NVARCHAR(20) NOT NULL DEFAULT 'USER',

    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until DATETIME2 NULL,

    is_active BIT NOT NULL DEFAULT 1,

    last_login_at DATETIME2 NULL,
    password_changed_at DATETIME2 NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NULL,

    CONSTRAINT ck_users_role CHECK (role IN ('USER', 'ADMIN'))
);
GO


-- ===============================
-- 2. LOGIN LOGS TABLE
-- Lưu log đăng nhập thành công / thất bại
-- ===============================
CREATE TABLE login_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NULL,
    username NVARCHAR(50) NOT NULL,

    success BIT NOT NULL,
    reason NVARCHAR(255) NULL,

    ip_address NVARCHAR(100) NULL,
    user_agent NVARCHAR(500) NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_login_logs_users
        FOREIGN KEY (user_id) REFERENCES users(id)
);
GO


-- ===============================
-- 3. PASSWORD RESET OTP TABLE
-- Lưu OTP quên mật khẩu
-- OTP nên được hash bằng BCrypt trước khi lưu
-- ===============================
CREATE TABLE password_reset_otps (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL,

    otp_hash NVARCHAR(500) NOT NULL,

    expires_at DATETIME2 NOT NULL,
    is_used BIT NOT NULL DEFAULT 0,

    failed_attempts INT NOT NULL DEFAULT 0,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    used_at DATETIME2 NULL,

    CONSTRAINT fk_password_reset_otps_users
        FOREIGN KEY (user_id) REFERENCES users(id)
);
GO


-- ===============================
-- 4. SESSIONS TABLE
-- Lưu session/JWT đang hoạt động
-- Dùng để vô hiệu hóa session cũ sau khi đổi mật khẩu
-- ===============================
CREATE TABLE sessions (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL,

    jwt_id NVARCHAR(255) NOT NULL,
    token_hash NVARCHAR(500) NULL,

    is_active BIT NOT NULL DEFAULT 1,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    expires_at DATETIME2 NOT NULL,

    revoked_at DATETIME2 NULL,
    revoked_reason NVARCHAR(255) NULL,

    CONSTRAINT fk_sessions_users
        FOREIGN KEY (user_id) REFERENCES users(id)
);
GO


-- ===============================
-- 5. PASSWORD CHANGE LOGS TABLE
-- Lưu log đổi mật khẩu / reset mật khẩu
-- ===============================
CREATE TABLE password_change_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,

    user_id INT NOT NULL,

    change_type NVARCHAR(50) NOT NULL,
    note NVARCHAR(255) NULL,

    ip_address NVARCHAR(100) NULL,
    user_agent NVARCHAR(500) NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT fk_password_change_logs_users
        FOREIGN KEY (user_id) REFERENCES users(id)
);
GO


-- ===============================
-- INDEXES
-- Giúp truy vấn log/session nhanh hơn
-- ===============================
CREATE INDEX idx_login_logs_user_id
ON login_logs(user_id);
GO

CREATE INDEX idx_login_logs_created_at
ON login_logs(created_at);
GO

CREATE INDEX idx_password_reset_otps_user_id
ON password_reset_otps(user_id);
GO

CREATE INDEX idx_sessions_user_id
ON sessions(user_id);
GO

CREATE INDEX idx_sessions_jwt_id
ON sessions(jwt_id);
GO