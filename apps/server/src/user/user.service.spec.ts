import { User } from '@app/common';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcrypt';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let jwtService: JwtService;

  const user: User = {
    id: '123',
    email: 'daniel.taylor@example.com',
    firstName: 'Daniel',
    lastName: 'Taylor',
    company: 'NextGen Labs',
    password: 'daniel2024',
  };
  const user2: User = {
    id: '456',
    email: 'chloe.evans@example.com',
    firstName: 'Chloe',
    lastName: 'Evans',
    company: 'BrightPath Solutions',
    password: 'mypassword',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked-jwt-token'),
            verify: jest
              .fn()
              .mockReturnValue({ sub: '1', email: 'test@example.com' }),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const id = await service.create(user);

      expect(id).toBeDefined();
      expect(service['users']).toHaveLength(1);
      expect(service['users'][0].email).toBe(user.email);
    });

    it('should throw error if email already exists', async () => {
      await service.create(user);

      await expect(service.create(user)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return JWT token for valid credentials', async () => {
      const hashed = await hash(user.password, 10);

      service['users'].push({ ...user, password: hashed });

      const token = await service.login(user.email, user.password);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.sign).toHaveBeenCalled();
      expect(token).toBe('mocked-jwt-token');
    });

    it('should throw if user not found', async () => {
      await expect(
        service.login('notfound@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if password is invalid', async () => {
      const hashed = await hash(user.password, 10);

      service['users'].push({ ...user, password: hashed });

      await expect(service.login(user.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('verifyToken', () => {
    it('should return decoded payload', () => {
      const result = service.verifyToken('mocked-token');
      expect(result).toEqual({ sub: '1', email: 'test@example.com' });
    });
  });

  describe('findOne', () => {
    it('should return a user if exists', () => {
      service['users'].push(user);

      const result = service.findOne('123');
      expect(result).toEqual({ user });
    });

    it('should throw if user not found', () => {
      expect(() => service.findOne('999')).toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all users sorted by email', () => {
      service['users'].push(user);

      const result = service.findAll();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].email).toBe(user.email);
    });
  });

  describe('mapUsersToUsersPreview', () => {
    it('should map user objects to previews', () => {
      const users = [user, user2];

      const previews = service.mapUsersToUsersPreview(users);
      expect(previews).toEqual([
        { id: user.id, email: user.email },
        { id: user2.id, email: user2.email },
      ]);
    });
  });
});
