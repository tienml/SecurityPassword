# SecurityPassword API Documentation

**Project:** Modern Password Authentication System  
**Backend:** Spring Boot REST API  
**Database:** SQL Server  
**Authentication:** JWT Bearer Token  
**Password hashing:** BCrypt  
**Main response format:** `ApiResponse<T>`

---

## 1. Base URL

### Local backend

```text
http://localhost:8080
```

### Khi dùng ngrok

```text
https://your-backend-ngrok-url.ngrok-free.app
```

Frontend chỉ cần thay `BASE_URL` theo môi trường.

```js
const BASE_URL = "http://localhost:8080";
// hoặc
const BASE_URL = "https://your-backend-ngrok-url.ngrok-free.app";
```

---

## 2. Response format chung

Tất cả API nên trả về theo format:

```json
{
  "success": true,
  "message": "Thông báo kết quả",
  "data": {}
}
```

Khi lỗi:

```json
{
  "success": false,
  "message": "Nội dung lỗi",
  "data": null
}
```

---

## 3. Authentication header

Các API cần đăng nhập phải gửi JWT trong header:

```http
Authorization: Bearer <token>
```

Ví dụ:

```js
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

---

# 4. Public Auth APIs

Các API này **không cần token**.

---

## 4.1. Register

Đăng ký tài khoản người dùng thường.

```http
POST /api/auth/register
```

### Request body

```json
{
  "userName": "tien",
  "email": "tien@example.com",
  "password": "Tien@123456"
}
```

### Validation

| Field | Rule |
|---|---|
| `userName` | Không rỗng, 4–50 ký tự |
| `email` | Không rỗng, đúng định dạng email |
| `password` | Không rỗng, tối thiểu 8 ký tự |

### Lưu ý cho frontend

- Không gửi field `role`.
- Backend luôn tạo tài khoản mới với `role = USER`.
- Mật khẩu được hash bằng BCrypt trước khi lưu database.

### Success response

```json
{
  "success": true,
  "message": "Đăng ký tài khoản thành công",
  "data": {
    "id": 1,
    "userName": "tien",
    "email": "tien@example.com",
    "role": "USER",
    "isActive": true,
    "failedAttempts": 0,
    "lockedUntil": null,
    "lastLoginAt": null,
    "passwordChangedAt": null,
    "createdAt": "2026-07-01T10:00:00"
  }
}
```

### Possible errors

```json
{
  "success": false,
  "message": "Username đã tồn tại",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Email đã tồn tại",
  "data": null
}
```

---

## 4.2. Login

Đăng nhập bằng username hoặc email.

```http
POST /api/auth/login
```

### Request body

```json
{
  "loginIdentifier": "tien",
  "password": "Tien@123456"
}
```

Hoặc:

```json
{
  "loginIdentifier": "tien@example.com",
  "password": "Tien@123456"
}
```

### Success response

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "tokenType": "Bearer",
    "expiresIn": 86400000,
    "userId": 1,
    "userName": "tien",
    "email": "tien@example.com",
    "role": "USER"
  }
}
```

### Frontend cần làm sau khi login thành công

Lưu token và thông tin user.

Ví dụ:

```js
localStorage.setItem("token", response.data.token);
localStorage.setItem("role", response.data.role);
localStorage.setItem("userName", response.data.userName);
```

Điều hướng:

```text
role = USER  → chuyển vào trang user/home
role = ADMIN → chuyển vào trang admin/dashboard
```

### Possible errors

```json
{
  "success": false,
  "message": "Tài khoản hoặc mật khẩu không đúng",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Tài khoản đang bị khóa tạm thời",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Tài khoản đã bị vô hiệu hóa",
  "data": null
}
```

---

## 4.3. Forgot Password

Gửi OTP về email để reset mật khẩu.

```http
POST /api/auth/forgot-password
```

### Request body

```json
{
  "email": "tien@example.com"
}
```

### Success response

```json
{
  "success": true,
  "message": "OTP đã được gửi về email",
  "data": null
}
```

### Frontend flow

1. Người dùng nhập email.
2. Gọi API `/api/auth/forgot-password`.
3. Nếu thành công, chuyển sang trang nhập OTP và mật khẩu mới.
4. Truyền email sang trang reset password.
5. Ở trang reset password, hiển thị email dạng chỉ đọc, không cho sửa.

Ví dụ UI:

```text
Email: tien@example.com    [readonly]
OTP: [______]
Mật khẩu mới: [______]
Xác nhận mật khẩu mới: [______]
```

### Possible errors

```json
{
  "success": false,
  "message": "Email không tồn tại trong hệ thống",
  "data": null
}
```

---

## 4.4. Reset Password

Xác thực OTP và đặt lại mật khẩu mới.

```http
POST /api/auth/reset-password
```

### Request body

```json
{
  "email": "tien@example.com",
  "otp": "123456",
  "newPassword": "NewPassword@123"
}
```

### Lưu ý

- `email` vẫn phải gửi lên backend dù frontend không cho người dùng sửa email.
- Backend dùng email để xác định OTP thuộc tài khoản nào.
- OTP được hash trong database, backend dùng BCrypt để verify.
- Sau khi reset password thành công, toàn bộ session/token cũ của user bị vô hiệu hóa.

### Success response

```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công",
  "data": null
}
```

### Frontend cần làm sau khi reset thành công

```text
1. Xóa token cũ nếu có.
2. Chuyển về trang login.
3. Hiển thị thông báo: Đặt lại mật khẩu thành công, vui lòng đăng nhập lại.
```

### Possible errors

```json
{
  "success": false,
  "message": "OTP không tồn tại hoặc đã hết hạn",
  "data": null
}
```

```json
{
  "success": false,
  "message": "OTP không đúng",
  "data": null
}
```

```json
{
  "success": false,
  "message": "OTP đã nhập sai quá nhiều lần",
  "data": null
}
```

---

# 5. Authenticated User APIs

Các API này **cần token**.

---

## 5.1. Get Current User

Lấy thông tin tài khoản đang đăng nhập.

```http
GET /api/auth/me
```

### Headers

```http
Authorization: Bearer <token>
```

### Success response

```json
{
  "success": true,
  "message": "Lấy thông tin tài khoản thành công",
  "data": {
    "id": 1,
    "userName": "tien",
    "email": "tien@example.com",
    "role": "USER",
    "isActive": true,
    "failedAttempts": 0,
    "lockedUntil": null,
    "lastLoginAt": "2026-07-01T10:20:00",
    "passwordChangedAt": null,
    "createdAt": "2026-07-01T10:00:00"
  }
}
```

---

## 5.2. Change Password

Đổi mật khẩu khi người dùng/admin đang đăng nhập.

```http
POST /api/auth/change-password
```

### Headers

```http
Authorization: Bearer <token>
```

### Request body

```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123"
}
```

### Success response

```json
{
  "success": true,
  "message": "Đổi mật khẩu thành công. Vui lòng đăng nhập lại.",
  "data": null
}
```

### Frontend cần làm sau khi đổi mật khẩu thành công

Do backend vô hiệu hóa toàn bộ session/token cũ sau khi đổi mật khẩu, frontend cần:

```text
1. Xóa token khỏi localStorage/sessionStorage.
2. Xóa role/userName nếu đã lưu.
3. Chuyển về trang login.
4. Hiển thị thông báo: Đổi mật khẩu thành công, vui lòng đăng nhập lại.
```

Ví dụ:

```js
localStorage.removeItem("token");
localStorage.removeItem("role");
localStorage.removeItem("userName");
navigate("/login");
```

### Possible errors

```json
{
  "success": false,
  "message": "Mật khẩu hiện tại không đúng",
  "data": null
}
```

```json
{
  "success": false,
  "message": "Mật khẩu mới không được trùng mật khẩu hiện tại",
  "data": null
}
```

---

# 6. Admin APIs

Các API này cần token của tài khoản có:

```text
role = ADMIN
```

Frontend cần gửi:

```http
Authorization: Bearer <admin_token>
```

Nếu user thường gọi API admin, backend sẽ trả lỗi 403 Forbidden.

---

## 6.1. Get All Users

Lấy danh sách tài khoản.

```http
GET /api/admin/users
```

### Success response

```json
{
  "success": true,
  "message": "Lấy danh sách user thành công",
  "data": [
    {
      "id": 1,
      "userName": "admin",
      "email": "admin@example.com",
      "role": "ADMIN",
      "isActive": true,
      "failedAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": "2026-07-01T10:20:00",
      "passwordChangedAt": null,
      "createdAt": "2026-07-01T10:00:00"
    },
    {
      "id": 2,
      "userName": "tien",
      "email": "tien@example.com",
      "role": "USER",
      "isActive": true,
      "failedAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": null,
      "passwordChangedAt": null,
      "createdAt": "2026-07-01T10:05:00"
    }
  ]
}
```

---

## 6.2. Get Login Logs

Admin xem log đăng nhập thành công/thất bại.

```http
GET /api/admin/login-logs
```

### Success response

```json
{
  "success": true,
  "message": "Lấy login logs thành công",
  "data": [
    {
      "id": 1,
      "userId": 1,
      "userName": "admin",
      "success": true,
      "reason": "LOGIN_SUCCESS",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-07-01T10:20:00"
    },
    {
      "id": 2,
      "userId": null,
      "userName": "hacker123",
      "success": false,
      "reason": "USER_NOT_FOUND",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-07-01T10:21:00"
    }
  ]
}
```

### Các reason có thể gặp

```text
LOGIN_SUCCESS
USER_NOT_FOUND
WRONG_PASSWORD
ACCOUNT_LOCKED
ACCOUNT_INACTIVE
```

---

## 6.3. Get Sessions

Admin xem danh sách session/JWT.

```http
GET /api/admin/sessions
```

### Success response

```json
{
  "success": true,
  "message": "Lấy danh sách session thành công",
  "data": [
    {
      "id": 1,
      "userId": 1,
      "userName": "admin",
      "jwtId": "8e6b1d21-9f5e-4d5a-b4a1-123456789abc",
      "isActive": true,
      "createdAt": "2026-07-01T10:20:00",
      "expiresAt": "2026-07-02T10:20:00",
      "revokedAt": null,
      "revokedReason": null
    },
    {
      "id": 2,
      "userId": 2,
      "userName": "tien",
      "jwtId": "7c6f1e11-1f2a-4a1a-b1c2-abcdef123456",
      "isActive": false,
      "createdAt": "2026-07-01T09:00:00",
      "expiresAt": "2026-07-02T09:00:00",
      "revokedAt": "2026-07-01T10:00:00",
      "revokedReason": "PASSWORD_CHANGED"
    }
  ]
}
```

### Revoked reason có thể gặp

```text
PASSWORD_CHANGED
PASSWORD_RESET
```

---

## 6.4. Get Password Change Logs

Admin xem log đổi/reset mật khẩu.

```http
GET /api/admin/password-change-logs
```

### Success response

```json
{
  "success": true,
  "message": "Lấy password change logs thành công",
  "data": [
    {
      "id": 1,
      "userId": 2,
      "userName": "tien",
      "changeType": "CHANGE_PASSWORD",
      "note": "User changed password",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-07-01T10:30:00"
    },
    {
      "id": 2,
      "userId": 2,
      "userName": "tien",
      "changeType": "RESET_PASSWORD",
      "note": "Password reset by OTP",
      "ipAddress": "127.0.0.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-07-01T11:00:00"
    }
  ]
}
```

---

# 7. Frontend flows

---

## 7.1. Register flow

```text
User nhập username, email, password
→ Frontend gọi POST /api/auth/register
→ Nếu thành công: chuyển sang login
→ Nếu lỗi: hiển thị message từ response
```

---

## 7.2. Login flow

```text
User nhập username/email + password
→ Frontend gọi POST /api/auth/login
→ Nếu thành công:
   - Lưu token
   - Lưu role
   - Nếu role = ADMIN → vào admin dashboard
   - Nếu role = USER → vào user home
→ Nếu lỗi:
   - Hiển thị message từ response
```

---

## 7.3. Protected API flow

```text
Frontend lấy token đã lưu
→ Gửi header Authorization: Bearer <token>
→ Backend kiểm tra:
   - JWT hợp lệ
   - JWT chưa hết hạn
   - Session trong bảng sessions còn active
   - User còn active
→ Nếu hợp lệ: cho truy cập
→ Nếu không hợp lệ: trả 401/403
```

---

## 7.4. Change password flow

```text
User/Admin đang đăng nhập
→ Nhập currentPassword + newPassword
→ Frontend gọi POST /api/auth/change-password kèm token
→ Backend:
   - Verify currentPassword bằng BCrypt
   - Hash newPassword bằng BCrypt
   - Update password_hash
   - Revoke toàn bộ session cũ
   - Ghi password_change_logs
→ Frontend:
   - Xóa token
   - Chuyển về login
```

---

## 7.5. Forgot/reset password flow

```text
Bước 1: Forgot password
User nhập email
→ Frontend gọi POST /api/auth/forgot-password
→ Backend tạo OTP 6 số, hash OTP, lưu DB, gửi email
→ Frontend chuyển sang trang reset password

Bước 2: Reset password
Frontend tự truyền email sang trang reset
→ Email hiển thị readonly
→ User nhập OTP + mật khẩu mới
→ Frontend gọi POST /api/auth/reset-password
→ Backend verify OTP bằng BCrypt
→ Backend đổi password_hash
→ Backend revoke toàn bộ session cũ
→ Frontend chuyển về login
```

---

## 7.6. Admin flow

```text
Admin login bằng POST /api/auth/login
→ Backend trả token với role = ADMIN
→ Frontend lưu token và role
→ Chuyển vào admin dashboard
→ Admin gọi:
   GET /api/admin/users
   GET /api/admin/login-logs
   GET /api/admin/sessions
   GET /api/admin/password-change-logs
```

---

# 8. Cách tạo tài khoản admin

Hệ thống không cho người dùng tự đăng ký admin từ frontend.

Cách tạo admin trong demo:

### Bước 1: Đăng ký tài khoản admin bằng API register

```json
{
  "userName": "admin",
  "email": "admin@example.com",
  "password": "Admin@123456"
}
```

Tài khoản này ban đầu có role:

```text
USER
```

### Bước 2: Set role admin trong SQL Server

```sql
UPDATE users
SET role = 'ADMIN'
WHERE username = 'admin';
```

### Bước 3: Đăng nhập lại tài khoản admin

```json
{
  "loginIdentifier": "admin",
  "password": "Admin@123456"
}
```

Nếu login thành công, response sẽ có:

```json
"role": "ADMIN"
```

---

# 9. Frontend notes

## 9.1. Không hiển thị password hash

Frontend không cần hiển thị `password_hash`.  
Phần chứng minh mật khẩu đã được bảo vệ sẽ chụp trong SQL Server.

## 9.2. Role-based routing

Frontend nên có logic:

```text
Nếu chưa có token → vào login
Nếu role = USER → vào trang user
Nếu role = ADMIN → vào trang admin
```

## 9.3. Token invalid sau đổi/reset mật khẩu

Sau khi đổi mật khẩu hoặc reset mật khẩu, token cũ không dùng được nữa vì backend đã revoke session.

Frontend nên xử lý:

```text
Nếu API trả 401/403:
- Xóa token local
- Chuyển về login
```

## 9.4. Ngrok

Nếu backend chạy qua ngrok, frontend gọi API bằng URL ngrok backend.

Ví dụ:

```js
const BASE_URL = "https://abc-xyz.ngrok-free.app";
```

Backend cần cấu hình CORS cho domain frontend.

---

# 10. Summary endpoints

| Method | Endpoint | Auth | Role | Chức năng |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | Any | Đăng ký user |
| POST | `/api/auth/login` | No | Any | Đăng nhập |
| POST | `/api/auth/forgot-password` | No | Any | Gửi OTP |
| POST | `/api/auth/reset-password` | No | Any | Reset mật khẩu bằng OTP |
| GET | `/api/auth/me` | Yes | USER/ADMIN | Lấy thông tin tài khoản hiện tại |
| POST | `/api/auth/change-password` | Yes | USER/ADMIN | Đổi mật khẩu |
| GET | `/api/admin/users` | Yes | ADMIN | Xem danh sách user |
| GET | `/api/admin/login-logs` | Yes | ADMIN | Xem log đăng nhập |
| GET | `/api/admin/sessions` | Yes | ADMIN | Xem session |
| GET | `/api/admin/password-change-logs` | Yes | ADMIN | Xem log đổi/reset mật khẩu |
