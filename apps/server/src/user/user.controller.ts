import type {
  UserDetailRequest,
  UserDetailResponse,
  UserListResponse,
  UserLoginRequest,
  UserLoginResponse,
  UserQueryRequest,
  UserQueryResponse,
  UserRegisterRequest,
  UserRegisterResponse,
  UserServiceController,
} from '@app/common';
import { UserServiceControllerMethods } from '@app/common';
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { UserService } from 'apps/server/src/user/user.service';

@Controller('user')
@UserServiceControllerMethods()
export class UserController implements UserServiceController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly usersService: UserService) {}

  @GrpcMethod('UserService', 'Register')
  async register(request: UserRegisterRequest): Promise<UserRegisterResponse> {
    const newUser = request.user;
    if (!newUser) {
      this.logger.warn('Register request missing user data.');
      throw new RpcException({
        statusCode: 400,
        message: 'Register request missing user data.',
      });
    }

    this.logger.log(`Received Register request for user: ${newUser?.email}`);

    try {
      const id = await this.usersService.create(newUser);
      this.logger.log(`User ${newUser.email} successfully registered.`);
      return { id };
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 500;
      const message =
        err instanceof Error ? err.message : 'Unknown server error';
      throw new RpcException({ code, message });
    }
  }

  @GrpcMethod('UserService', 'Login')
  async login(request: UserLoginRequest): Promise<UserLoginResponse> {
    const { email, password } = request;
    this.logger.log(`Received Login request for user: ${email}`);

    try {
      const token = await this.usersService.login(email, password);
      this.logger.log(`User ${email} successfully logged in.`);
      return { token };
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown server error';
      throw new RpcException({ code: 500, message });
    }
  }

  @GrpcMethod('UserService', 'UserDetail')
  userDetail(request: UserDetailRequest): UserDetailResponse {
    const userId = request.userId;
    this.logger.log(`Received UserDetail request for ID: ${userId}`);

    try {
      const response = this.usersService.findOne(userId);

      this.logger.log(`User detail ${userId} retrieved successfully.`);
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown server error';
      throw new RpcException({ code: 500, message });
    }
  }

  @GrpcMethod('UserService', 'ListUsers')
  listUsers(): UserListResponse {
    this.logger.log(`Received ListUsers request.`);
    try {
      const response = this.usersService.findAll();
      this.logger.log(`Returning ${response.users.length} users.`);
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown server error';
      throw new RpcException({ code: 500, message });
    }
  }

  @GrpcMethod('UserService', 'QueryUsers')
  queryUsers(request: UserQueryRequest): UserQueryResponse {
    this.logger.log(
      `Received QueryUsers request: page=${request.page}, limit=${request.limit}`,
    );
    try {
      const response = this.usersService.queryUsers(request);
      this.logger.log(
        `Returning ${response.users.length} users for page ${request.page}`,
      );
      return response;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown server error';
      throw new RpcException({ code: 500, message });
    }
  }
}
