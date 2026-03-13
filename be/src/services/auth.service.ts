import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { IUser } from '../models/User.model';
import { AppError } from '../middlewares/error.middleware';
import {
  RegisterBody,
  LoginBody,
  AuthTokens,
  ForgotPasswordBody,
  ResetPasswordBody,
  UpdatePasswordBody,
  UpdateProfileBody,
} from '../types';
import {
  MAX_LOGIN_ATTEMPTS,
  LOCK_DURATION_MS,
  PASSWORD_MIN_LENGTH,
} from '../constants';
import { isTruthy, parseFullName } from '../utils/validation.util';

export class AuthService {
  /**
   * Generate access & refresh tokens for a user
   */
  static generateTokens(user: IUser): AuthTokens {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    } as any);

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' } as any
    );

    return { accessToken, refreshToken };
  }

  /**
   * REGISTER - Create new user
   * Maps to FE Register.jsx: formData { fullName, email, phone, password, confirmPassword }
   * and selectedRole ('farmer' | 'enterprise')
   */
  static async register(body: RegisterBody): Promise<{ user: IUser; tokens: AuthTokens }> {
    const { fullName, email, phone, password, confirmPassword, role, agreeTerms, province, district, ward } = body;

    if (password !== confirmPassword) {
      throw new AppError('Mật khẩu xác nhận không khớp', 400);
    }

    if (!isTruthy(agreeTerms)) {
      throw new AppError('Vui lòng đồng ý với điều khoản sử dụng', 400);
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 400);
    }

    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        throw new AppError('Số điện thoại đã được sử dụng', 400);
      }
    }

    const { firstName, lastName } = parseFullName(fullName);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      role,
      firstName,
      lastName,
      fullName: fullName.trim(),
      phone,
      ...(province && { province }),
      ...(district && { district }),
      ...(ward && { ward }),
    });

    // Generate tokens
    const tokens = AuthService.generateTokens(user);

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    // Send email verification (non-blocking — don't fail registration if email fails)
    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    AuthService.sendVerificationEmail(user.email, user.fullName, verificationToken).catch(
      (err) => console.error('[Auth] Failed to send verification email after register:', err)
    );

    // Remove sensitive data
    user.password = undefined as any;

    return { user, tokens };
  }

  /**
   * LOGIN - Authenticate user
   * Maps to FE Auth.jsx: formData { emailOrPhone, password, rememberMe }
   * emailOrPhone can be email or phone number
   */
  static async login(body: LoginBody): Promise<{ user: IUser; tokens: AuthTokens }> {
    const { emailOrPhone, password, rememberMe } = body;

    if (!emailOrPhone || !password) {
      throw new AppError('Vui lòng nhập email/số điện thoại và mật khẩu', 400);
    }

    const isEmail = emailOrPhone.includes('@');
    const query = isEmail
      ? { email: emailOrPhone.toLowerCase() }
      : { phone: emailOrPhone };

    const user = await User.findOne(query).select(
      '+password +refreshToken +loginAttempts +lockUntil'
    );

    if (!user) {
      throw new AppError('Email/Số điện thoại hoặc mật khẩu không đúng', 401);
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa. Liên hệ hỗ trợ.', 403);
    }

    if (user.isLocked()) {
      throw new AppError(
        'Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.',
        423
      );
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      }
      await user.save({ validateBeforeSave: false });

      const remainingAttempts = MAX_LOGIN_ATTEMPTS - user.loginAttempts;
      if (remainingAttempts > 0) {
        throw new AppError(
          `Email/Số điện thoại hoặc mật khẩu không đúng. Còn ${remainingAttempts} lần thử.`,
          401
        );
      } else {
        throw new AppError(
          'Tài khoản đã bị khóa tạm thời do đăng nhập sai nhiều lần.',
          423
        );
      }
    }

    const tokens = AuthService.generateTokens(user);

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    // Remove sensitive data
    user.password = undefined as any;

    return { user, tokens };
  }

  /**
   * LOGOUT - Invalidate refresh token
   */
  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      refreshToken: undefined,
    });
  }

  /**
   * REFRESH TOKEN - Generate new access token from refresh token
   */
  static async refreshToken(token: string): Promise<AuthTokens> {
    if (!token) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Find user with matching refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const tokens = AuthService.generateTokens(user);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return tokens;
  }

  /**
   * FORGOT PASSWORD - Generate reset token and return it
   * In production: send via email. Here we return the token in response.
   */
  static async forgotPassword(
    body: ForgotPasswordBody
  ): Promise<{ resetToken?: string; message: string }> {
    const { email } = body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AppError('Không tìm thấy tài khoản với email này', 404);
    }

    if (!user.isActive) {
      throw new AppError('Tài khoản đã bị vô hiệu hóa', 403);
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send password reset email via nodemailer
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"PreOnic" <${smtpUser}>`,
          to: user.email,
          subject: '[PreOnic] Đặt lại mật khẩu của bạn',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #16a34a; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">PreOnic</h1>
                <p style="margin: 5px 0 0;">Nền tảng kết nối nông nghiệp bền vững</p>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                <p style="color: #555;">Xin chào <strong>${user.fullName}</strong>,</p>
                <p style="color: #555;">Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản PreOnic. Link có hiệu lực trong <strong>10 phút</strong>.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetURL}" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Đặt lại mật khẩu</a>
                </div>
                <p style="color: #555; font-size: 13px;">Hoặc dán link: <span style="word-break: break-all; color: #16a34a;">${resetURL}</span></p>
                <p style="color: #555;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="color: #999; font-size: 12px;">Email tự động từ hệ thống PreOnic. Vui lòng không trả lời.</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        throw new AppError('Không thể gửi email. Vui lòng thử lại sau.', 500);
      }
    }

    return {
      resetToken: smtpHost ? undefined : resetToken,
      message: smtpHost
        ? 'Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.'
        : 'Token đặt lại mật khẩu đã được tạo. Token có hiệu lực trong 10 phút.',
    };
  }

  /**
   * RESET PASSWORD - Set new password using reset token
   */
  static async resetPassword(body: ResetPasswordBody): Promise<IUser> {
    const { token, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new AppError('Mật khẩu xác nhận không khớp', 400);
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new AppError(`Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`, 400);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw new AppError(
        'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.',
        400
      );
    }

    // Update password and clear reset fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    return user;
  }

  /**
   * UPDATE PASSWORD - Change password for authenticated user
   */
  static async updatePassword(
    userId: string,
    body: UpdatePasswordBody
  ): Promise<{ user: IUser; tokens: AuthTokens }> {
    const { currentPassword, newPassword, confirmNewPassword } = body;

    if (newPassword !== confirmNewPassword) {
      throw new AppError('Mật khẩu mới xác nhận không khớp', 400);
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      throw new AppError(`Mật khẩu mới phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`, 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError('Mật khẩu mới không được trùng với mật khẩu hiện tại', 400);
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) {
      throw new AppError('Mật khẩu hiện tại không đúng', 401);
    }

    user.password = newPassword;
    await user.save();

    const tokens = AuthService.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    user.password = undefined as any;

    return { user, tokens };
  }

  /**
   * GET ME - Get current user profile
   */
  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }
    return user;
  }

  /**
   * UPDATE PROFILE - Update user profile info (not password)
   */
  static async updateProfile(
    userId: string,
    body: UpdateProfileBody
  ): Promise<IUser> {
    const ALLOWED_PROFILE_FIELDS: (keyof UpdateProfileBody)[] = [
      'firstName', 'lastName', 'fullName', 'phone', 'avatar',
    ];

    const updateData: Partial<UpdateProfileBody> = {};
    for (const field of ALLOWED_PROFILE_FIELDS) {
      if (body[field] !== undefined) {
        (updateData as any)[field] = body[field];
      }
    }

    if (updateData.fullName) {
      const { firstName, lastName } = parseFullName(updateData.fullName);
      (updateData as any).firstName = firstName;
      (updateData as any).lastName = lastName;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    return user;
  }

  /**
   * DEACTIVATE ACCOUNT - Soft delete
   */
  static async deactivateAccount(userId: string): Promise<void> {
    const user = await User.findByIdAndUpdate(userId, {
      isActive: false,
      refreshToken: undefined,
    });

    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }
  }

  /**
   * VERIFY EMAIL - Confirm email address with token from link
   */
  static async verifyEmail(token: string): Promise<IUser> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      throw new AppError('Link xác minh không hợp lệ hoặc đã hết hạn.', 400);
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return user;
  }

  /**
   * RESEND VERIFICATION EMAIL - Generate new token and send email
   */
  static async resendVerificationEmail(
    userId: string
  ): Promise<{ message: string }> {
    const user = await User.findById(userId).select('+emailVerificationToken +emailVerificationExpires');
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    if (user.isVerified) {
      throw new AppError('Tài khoản đã được xác minh email rồi.', 400);
    }

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await AuthService.sendVerificationEmail(user.email, user.fullName, verificationToken);

    return { message: 'Email xác minh đã được gửi lại. Vui lòng kiểm tra hộp thư.' };
  }

  /**
   * Send verification email — uses nodemailer if configured, otherwise logs token
   */
  private static async sendVerificationEmail(
    email: string,
    fullName: string,
    token: string
  ): Promise<void> {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"PreOnic" <noreply@preonic.vn>',
          to: email,
          subject: '[PreOnic] Xác minh địa chỉ email của bạn',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0;">PreOnic</h1>
                <p style="margin: 5px 0 0;">Nền tảng kết nối nông nghiệp bền vững</p>
              </div>
              <div style="padding: 32px; background: #f9f9f9;">
                <h2 style="color: #333;">Xin chào ${fullName}!</h2>
                <p style="color: #555; line-height: 1.6;">
                  Cảm ơn bạn đã đăng ký tài khoản PreOnic. Vui lòng nhấn nút bên dưới để xác minh địa chỉ email của bạn.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${verifyUrl}"
                    style="background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px;
                           text-decoration: none; font-weight: bold; font-size: 16px;">
                    Xác minh email
                  </a>
                </div>
                <p style="color: #777; font-size: 13px;">
                  Nếu nút không hoạt động, hãy copy đường link này vào trình duyệt:<br/>
                  <a href="${verifyUrl}" style="color: #16a34a;">${verifyUrl}</a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 20px;">
                  Link có hiệu lực trong 24 giờ. Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.
                </p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('[Auth] Email send failed:', emailErr);
        // Non-critical: log token so dev can test without SMTP
        console.log(`[Email MOCK] Verification URL: ${verifyUrl}`);
      }
    } else {
      // Dev mode: log to console so registration still works without SMTP config
      console.log(`[Email MOCK] Verification URL for ${email}: ${verifyUrl}`);
    }
  }
}
