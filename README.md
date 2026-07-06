# SecurityPassword

<p align="center">
  <strong>Modern Password Authentication System – Ứng dụng SHA và TripleDES để bảo vệ mật khẩu người dùng trong cơ sở dữ liệu.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Java-21+-orange" />
  <img src="https://img.shields.io/badge/Spring%20Boot-Backend-brightgreen" />
  <img src="https://img.shields.io/badge/Database-SQL%20Server-blue" />
  <img src="https://img.shields.io/badge/Auth-JWT-purple" />
  <img src="https://img.shields.io/badge/Password-BCrypt-darkgreen" />
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-yellow" />
  <img src="https://img.shields.io/badge/UI-Bootstrap-7952B3" />
  <img src="https://img.shields.io/badge/OTP-Email-red" />
</p>

## Giới thiệu đề tài

**SecurityPassword** là project demo cho đề tài:

**Modern Password Authentication System – Ứng dụng SHA và TripleDES để bảo vệ mật khẩu người dùng trong cơ sở dữ liệu**

Mục tiêu của project là xây dựng một hệ thống xác thực mật khẩu hiện đại, trong đó mật khẩu người dùng không được lưu dưới dạng plaintext, không dùng SHA-256 đơn thuần và không dùng TripleDES để mã hóa mật khẩu. Thay vào đó, hệ thống sử dụng **BCrypt** để hash mật khẩu an toàn hơn.

Project gồm:

- Backend: Spring Boot REST API
- Frontend: HTML, CSS, JavaScript, Bootstrap
- Database: SQL Server
- Authentication: JWT
- Password Hashing: BCrypt
- OTP Reset Password: Email OTP

## Cấu trúc thư mục

```text
SecurityPassword/
├── Backend/
│   ├── src/
│   └── pom.xml
│
├── Frontend/
│   ├── login.html
│   ├── register.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   ├── admin.html
│   ├── css/
│   └── js/
│
├── doc/
│   └── api/
│       └── SecurityPassword_API_Documentation.md
│
└── README.md
```

## Chức năng chính

### User

- Đăng ký tài khoản
- Đăng nhập bằng username hoặc email
- Mật khẩu được hash bằng BCrypt trước khi lưu vào database
- Đổi mật khẩu
- Quên mật khẩu bằng OTP gửi qua email
- Reset mật khẩu bằng OTP
- Tự động khóa tài khoản tạm thời nếu nhập sai mật khẩu nhiều lần
- Tự động mở khóa sau thời gian cấu hình

### Admin

- Đăng nhập bằng tài khoản có role `ADMIN`
- Xem danh sách user
- Xem lịch sử đăng nhập
- Xem danh sách session/token
- Xem log đổi/reset mật khẩu

## Hướng dẫn chạy project

### 1. Yêu cầu trước khi chạy

Cần cài đặt các công cụ sau:

- Java JDK 21+
- SQL Server
- SQL Server Management Studio
- IntelliJ IDEA hoặc VS Code
- Git
- VS Code Live Server nếu chạy frontend HTML/CSS/JavaScript
- Ngrok nếu muốn public backend cho frontend gọi API

Kiểm tra Java:

```bash
java -version
```

Kiểm tra Maven:

```bash
mvn -version
```

---

### 2. Clone source code

```bash
git clone https://github.com/tienml/SecurityPassword.git
cd SecurityPassword
```

Lấy code mới nhất từ nhánh `main`:

```bash
git pull origin main
```

---

### 3. Chuẩn bị database

Mở SQL Server Management Studio và tạo database:

```sql
CREATE DATABASE AuthSystem;
GO

USE AuthSystem;
GO
```

Sau đó chạy file SQL tạo bảng nếu project có cung cấp.

Các bảng chính của hệ thống:

```text
users
login_logs
password_reset_otps
sessions
password_change_logs
```

---

### 4. Cấu hình backend

Mở file:

```text
Backend/src/main/resources/application.properties
```

Cấu hình theo máy local:

```properties
spring.application.name=SecurityPassword

server.port=8080

spring.datasource.url=jdbc:sqlserver://localhost:1433;databaseName=AuthSystem;encrypt=true;trustServerCertificate=true
spring.datasource.username=YOUR_DB_USERNAME
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.microsoft.sqlserver.jdbc.SQLServerDriver

spring.jpa.hibernate.ddl-auto=none
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

app.jwt.secret=YOUR_JWT_SECRET_KEY
app.jwt.expiration=86400000

app.security.max-failed-attempts=5
app.security.lock-duration-seconds=15
app.security.otp-expiration-minutes=10
app.security.max-otp-failed-attempts=5

spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=YOUR_EMAIL
spring.mail.password=YOUR_GMAIL_APP_PASSWORD
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

app.cors.allowed-origin-patterns=http://localhost:5500,http://127.0.0.1:5500,https://*.ngrok-free.app,https://*.ngrok-free.dev
```

> Lưu ý: Không nên push `application.properties` chứa database password, Gmail app password hoặc JWT secret thật lên GitHub.

---

### 5. Chạy backend

Di chuyển vào thư mục backend:

```bash
cd Backend
```

Chạy project bằng Maven:

```bash
mvn spring-boot:run
```

Nếu project có Maven Wrapper, có thể chạy:

```bash
./mvnw spring-boot:run
```

Trên Windows PowerShell:

```powershell
.\mvnw spring-boot:run
```

Backend mặc định chạy tại:

```text
http://localhost:8080
```

---

### 6. Chạy frontend

Mở project bằng VS Code.

Cài extension:

```text
Live Server
```

Mở file:

```text
Fontend/login.html
```

Click chuột phải và chọn:

```text
Open with Live Server
```

Frontend thường chạy tại:

```text
http://127.0.0.1:5500
```

hoặc:

```text
http://localhost:5500
```

> Lưu ý: Frontend đang cấu hình chạy bằng ngrok https://grandpa-discharge-isolated.ngrok-free.dev, nếu muốn chạy bằng local thì cấu hình lại thành http://127.0.0.1:5500 hoặc http://localhost:5500.

---

### 7. Chạy backend qua ngrok

Nếu frontend cần gọi backend qua ngrok, chạy lệnh:

```bash
ngrok http 8080
```

Ngrok sẽ tạo URL dạng:

```text
https://example.ngrok-free.dev
```

Copy URL này vào file JavaScript frontend:

```js
const DEFAULT_BASE_URL = "https://example.ngrok-free.dev";
```

Nếu dùng ngrok free, frontend có thể thêm header:

```js
"ngrok-skip-browser-warning": "true"
```

Ví dụ:

```js
fetch(`${BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  },
  body: JSON.stringify({
    loginIdentifier: "admin",
    password: "Admin@123456"
  })
});
```

---

## Tài khoản demo

### User thường

Có thể đăng ký trực tiếp trên giao diện hoặc gọi API:

```http
POST /api/auth/register
```

Request body:

```json
{
  "userName": "tien",
  "email": "tien@example.com",
  "password": "Tien@123456"
}
```

Sau khi đăng ký, tài khoản mặc định có role:

```text
USER
```

---

### Admin

Hệ thống không cho người dùng tự đăng ký tài khoản admin từ frontend để tránh lỗ hổng phân quyền.

Cách tạo tài khoản admin trong demo:

#### Bước 1: Đăng ký tài khoản admin bằng API register

```http
POST /api/auth/register
```

Request body:

```json
{
  "userName": "admin",
  "email": "admin@example.com",
  "password": "Admin@123456"
}
```

Tài khoản vừa tạo ban đầu vẫn có role:

```text
USER
```

#### Bước 2: Cập nhật role admin trong SQL Server

Chạy câu lệnh sau trong SQL Server Management Studio:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE username = 'admin';
```

#### Bước 3: Đăng nhập lại bằng tài khoản admin

```http
POST /api/auth/login
```

Request body:

```json
{
  "loginIdentifier": "admin",
  "password": "Admin@123456"
}
```

Nếu đăng nhập thành công, response sẽ có:

```json
{
  "role": "ADMIN"
}
```

---

## API chính

| Method | Endpoint | Auth | Role | Chức năng |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | Any | Đăng ký tài khoản |
| POST | `/api/auth/login` | No | Any | Đăng nhập |
| POST | `/api/auth/forgot-password` | No | Any | Gửi OTP reset mật khẩu |
| POST | `/api/auth/reset-password` | No | Any | Reset mật khẩu bằng OTP |
| GET | `/api/auth/me` | Yes | USER/ADMIN | Lấy thông tin tài khoản hiện tại |
| POST | `/api/auth/change-password` | Yes | USER/ADMIN | Đổi mật khẩu |
| GET | `/api/admin/users` | Yes | ADMIN | Xem danh sách user |
| GET | `/api/admin/login-logs` | Yes | ADMIN | Xem log đăng nhập |
| GET | `/api/admin/sessions` | Yes | ADMIN | Xem session/token |
| GET | `/api/admin/password-change-logs` | Yes | ADMIN | Xem log đổi/reset mật khẩu |

---
