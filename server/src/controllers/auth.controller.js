import { loginUser, refreshAccessToken } from '../services/auth.service.js';
import { config } from '../config/env.js';

// HTTP-Only cookie security options
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/',
};

/**
 * Controller: Authenticate user by credentials and set HTTP-Only JWT tokens.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const { user, tokens } = await loginUser({ email, password, ipAddress });

    // Set HTTP-Only cookies
    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Refresh expired access token using valid refresh token cookie.
 */
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { user, tokens } = await refreshAccessToken(refreshToken);

    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Logout user and clear all HTTP-Only cookies.
 */
export const logout = async (req, res, next) => {
  try {
    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Retrieve current authenticated user profile.
 */
export const getMe = async (req, res, next) => {
  try {
    const { passwordHash, ...sanitized } = req.user;
    res.status(200).json({
      success: true,
      data: { user: sanitized },
    });
  } catch (err) {
    next(err);
  }
};

