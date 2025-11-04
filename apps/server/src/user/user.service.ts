import {
  JwtPayload,
  User,
  type UserDetailResponse,
  UserDto,
  UserListResponse,
  UserPreview,
  UserQueryRequest,
  UserQueryResponse,
} from '@app/common';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  private readonly users: User[] = [];

  constructor(private readonly jwtService: JwtService) {}

  async create(userDto: UserDto): Promise<string> {
    if (userDto && this.users.some((u: User) => u.email === userDto.email)) {
      throw new UnauthorizedException({
        statusCode: 409,
        message: `User with email ${userDto.email} already registered`,
      });
    }

    const hashedPassword: string = await hash(userDto.password, 10);

    const user: User = {
      ...userDto,
      id: randomUUID(),
      password: hashedPassword,
    };

    this.users.push(user);
    return user.id;
  }

  async login(email: string, password: string): Promise<string> {
    const user = this.users.find((u) => u.email === email);
    if (!user) throw new UnauthorizedException('User does not exist');

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

    return this.jwtService.sign({ sub: user.id, email: user.email });
  }

  verifyToken(token: string): JwtPayload {
    return this.jwtService.verify(token);
  }

  findOne(id: string): UserDetailResponse {
    const user = this.users.find((user) => user.id === id);
    if (!user) {
      throw new NotFoundException(
        { code: 404 },
        `User with ID ${id} not found`,
      );
    }
    return { user };
  }

  findAll(): UserListResponse {
    return {
      users: this.mapUsersToUsersPreview(this.users).sort((a, b) =>
        a.email.localeCompare(b.email),
      ),
    };
  }

  queryUsers(request: UserQueryRequest): UserQueryResponse {
    const { page, limit } = request;
    if (!Number.isInteger(page) || page < 0) {
      throw new Error('Page must be an integer greater or equal to 0');
    }
    const allowedLimits = [5, 10, 25];
    if (!allowedLimits.includes(limit)) {
      throw new Error(`Limit must be one of ${allowedLimits.join(', ')}`);
    }

    const start = (page - 1) * limit;
    const end = start + limit;
    const users = this.mapUsersToUsersPreview(this.users)
      .slice(start, end)
      .sort((a, b) => a.email.localeCompare(b.email));

    return {
      users,
      total: this.users.length,
      page,
      limit,
    };
  }

  mapUsersToUsersPreview(users: User[]): UserPreview[] {
    return users.map((u) => {
      return { id: u.id, email: u.email };
    });
  }
}
