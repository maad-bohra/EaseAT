import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../middleware/auth.js';

const publicUser = {
  id: true,
  name: true,
  email: true,
  semester: true,
  year: true,
  collegeName: true,
  requiredAttendance: true,
  createdAt: true,
};

export async function register(data) {
  const email = data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const passwordHash = await bcrypt.hash(data.password, env.bcryptRounds);
  const user = await prisma.user.create({
    data: {
      name: data.name.trim(),
      email,
      passwordHash,
      semester: data.semester,
      year: data.year,
      collegeName: data.collegeName,
      requiredAttendance: data.requiredAttendance ?? 75,
    },
    select: publicUser,
  });

  return { user, token: signToken(user.id) };
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  // Same message for unknown email and wrong password: no account enumeration.
  if (!user) throw ApiError.unauthorized('That email and password do not match');

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('That email and password do not match');

  const { passwordHash, ...rest } = user;
  return { user: rest, token: signToken(user.id) };
}

export function getProfile(userId) {
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select: publicUser });
}

export function updateProfile(userId, data) {
  return prisma.user.update({ where: { id: userId }, data, select: publicUser });
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest('Your current password is not correct');

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
