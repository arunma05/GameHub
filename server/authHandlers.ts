import { Socket, Server } from 'socket.io';
import prisma from './database';
import bcrypt from 'bcryptjs';
import { RegisterSchema, LoginSchema } from './validation';
import { AugmentedSocket } from './roomHandlers';

const CAPTCHAS: Record<string, number> = {}; // socketId -> expectedResult

export const handleGetCaptcha = (socket: Socket) => {
  const n1 = Math.floor(Math.random() * 10) + 1;
  const n2 = Math.floor(Math.random() * 10) + 1;
  CAPTCHAS[socket.id] = n1 + n2;
  return { n1, n2 };
};

export const handleRegister = async (socket: Socket, data: any, callback: (res: any) => void) => {
  console.log('Registration request:', data.username);
  try {
    const validated = RegisterSchema.parse(data);
    
    // Verify Captcha
    if (CAPTCHAS[socket.id] !== validated.captchaResponse) {
      return callback({ success: false, message: 'Invalid captcha' });
    }
    delete CAPTCHAS[socket.id];

    const existing = await prisma.user.findUnique({ where: { username: validated.username } });
    if (existing) {
      return callback({ success: false, message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);
    const user = await prisma.user.create({
      data: {
        username: validated.username,
        name: validated.name,
        password: hashedPassword,
        theme: 'dark'
      }
    });

    callback({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        theme: user.theme 
      } 
    });
  } catch (err: any) {
    callback({ success: false, message: err.errors ? err.errors[0].message : 'Registration failed' });
  }
};

export const handleLogin = async (socket: Socket, data: any, callback: (res: any) => void) => {
  console.log('Login request:', data.username);
  try {
    const validated = LoginSchema.parse(data);
    const user = await prisma.user.findUnique({ where: { username: validated.username } });
    
    if (!user) {
      return callback({ success: false, message: 'User not found' });
    }

    const valid = await bcrypt.compare(validated.password, user.password);
    if (!valid) {
      return callback({ success: false, message: 'Invalid password' });
    }

    callback({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        name: user.name, 
        theme: user.theme 
      } 
    });
  } catch (err: any) {
    callback({ success: false, message: 'Login failed' });
  }
};

export const handleGuestLogin = async (socket: Socket, callback: (res: any) => void) => {
  console.log('Guest login request from:', socket.id);
  const guestId = Math.random().toString(36).substring(7).toUpperCase();
  const guestName = `Guest_${guestId}`;
  callback({ 
    success: true, 
    user: { 
      id: -1, 
      username: guestName, 
      name: guestName, 
      theme: 'dark',
      isGuest: true 
    } 
  });
};

export const handleUpdateTheme = async (socket: Socket, theme: string) => {
    const s = socket as any;
    if (s.userId && s.userId !== -1) {
        await prisma.user.update({
            where: { id: s.userId },
            data: { theme }
        });
    }
};
