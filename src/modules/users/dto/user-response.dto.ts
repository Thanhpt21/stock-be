import { User } from '@prisma/client';

export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  gender: string | null;
  avatar: string | null;
  isActive: boolean;
  type_account: string;
  createdAt: Date;
  updatedAt: Date;
  conversationId: number | null;

  constructor(user: User & { conversationId?: number | null }) {  // Sửa constructor
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.phone = user.phone;        // Thêm phone
    this.gender = user.gender;      // Thêm gender
    this.avatar = user.avatar;
    this.isActive = user.isActive;
    this.type_account = user.type_account;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.conversationId = (user as any).conversationId || null;  // Lấy conversationId từ user object
  }
}