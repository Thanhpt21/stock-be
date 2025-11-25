export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  gender: string | null;
  type_account: string;
  avatar: string | null;
  isActive: boolean;

  constructor(user: any) {
    this.id = user.id;
    this.name = user.name;
    this.email = user.email;
    this.role = user.role;
    this.phone = user.phone;
    this.gender = user.gender;
    this.type_account = user.type_account;
    this.avatar = user.avatar;
    this.isActive = user.isActive;
  }
}
