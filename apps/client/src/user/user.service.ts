import {
  USER_PACKAGE_NAME,
  USER_SERVICE_NAME,
  UserDto,
  UserLoginRequest,
  UserPreview,
  UserQueryResponse,
  UserRegisterRequest,
  UserServiceClient,
} from '@app/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import * as fs from 'fs';
import { join } from 'path';
import {
  firstValueFrom,
  Observable,
  Subject,
  Subscription,
  switchMap,
  tap,
} from 'rxjs';

@Injectable()
export class UserService implements OnModuleInit {
  private userService: UserServiceClient;
  private readonly pageRequest = new Subject<{
    page: number;
    limit: number;
  }>();

  async onModuleInit() {
    this.userService =
      this.client.getService<UserServiceClient>(USER_SERVICE_NAME);

    // UC 4.1 Load and register users from a file
    Logger.debug('UC 4.1. Load and register users from a file');
    const users = this.loadUsersFromFile();
    await this.registerAllUsers(users);

    // US 4.2.1
    Logger.debug('UC 4.2.1. Query users with pagination');
    await this.queryUsers(2, 5);
    // US 4.2.2
    Logger.debug('UC 4.2.2. Query users with pagination');
    await this.queryUsers(2, 10);
    // US 4.2.3
    Logger.debug('UC 4.2.3. Register a user that already exists');
    await this.implementUC423();
    // US 4.2.4
    Logger.debug(
      'UC 4.2.4. Login a user that already exists and get a JWT token',
    );
    await this.implementUC424();
  }

  constructor(@Inject(USER_PACKAGE_NAME) private client: ClientGrpc) {}

  register(registerRequest: UserRegisterRequest) {
    return this.userService.register(registerRequest);
  }

  login(loginRequest: UserLoginRequest) {
    return this.userService.login(loginRequest);
  }

  listUsers() {
    return this.userService.listUsers({});
  }

  userDetail(userId: string) {
    return this.userService.userDetail({ userId });
  }

  initPagination(): Observable<UserQueryResponse> {
    return this.pageRequest.pipe(
      tap(({ page, limit }) =>
        Logger.log(`Requesting users for page=${page}, limit=${limit}`),
      ),
      switchMap(({ page, limit }) =>
        this.userService.queryUsers({ page, limit }),
      ),
    );
  }

  nextPage(page: number, limit: number) {
    this.pageRequest.next({ page, limit });
  }

  private loadUsersFromFile(): UserDto[] {
    const filePath = join(__dirname, '../users-init.json');
    try {
      const usersData = JSON.parse(
        fs.readFileSync(filePath, 'utf8'),
      ) as UserDto[];
      Logger.log(
        `Successfully loaded ${usersData.length} users from ${filePath}`,
      );
      return usersData;
    } catch (e) {
      if (e.code === 'ENOENT') {
        Logger.warn(`File not found: ${filePath}. No users loaded.`);
      } else {
        Logger.error(`Error loading users from ${filePath}: ${e.message}`);
      }
      return [];
    }
  }

  private async registerAllUsers(users: UserDto[]) {
    const results = await Promise.allSettled(
      users.map((user) =>
        firstValueFrom(this.userService.register({ user })).then(
          (res) => res.id,
        ),
      ),
    );

    const registeredIds = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    if (registeredIds.length > 0) {
      Logger.log(`Registered user IDs: ${registeredIds.join(', ')}`);
    } else {
      Logger.warn('No users registered.');
    }
  }

  async queryUsers(page: number, limit: number) {
    const allowedLimits = [5, 10, 25];
    if (!Number.isInteger(page) || page < 0) {
      throw new BadRequestException(
        'Page must be an integer greater or equal to 0',
      );
    }

    if (!allowedLimits.includes(limit)) {
      throw new BadRequestException(
        `Limit must be one of ${allowedLimits.join(', ')}`,
      );
    }

    await new Promise((resolve) => {
      const subscription: Subscription = this.initPagination().subscribe(
        (response: UserQueryResponse) => {
          const receivedUserIds: string = response.users
            .map((u: UserPreview) => u.id)
            .join(', ');
          Logger.log(
            `Received ${response.users.length} users (page ${response.page}), Received user ids: ${receivedUserIds}`,
          );
          resolve(response);
          subscription.unsubscribe();
        },
      );

      this.nextPage(+page, +limit);
    });
  }

  async implementUC423() {
    try {
      await firstValueFrom(
        this.register({
          user: {
            email: 'samuel.white@example.com',
            firstName: 'Samuel',
            lastName: 'White',
            company: 'NextVision',
            password: 'samuelPWD',
          },
        }),
      );
    } catch (e) {
      if (e.code === 5) {
        Logger.warn('User already exists.');
      } else {
        Logger.error(`Error registering user: ${e.message}`);
      }
    }
  }

  async implementUC424() {
    try {
      const email = 'samuel.white@example.com';
      const password = 'samuelPWD';
      const loginResponse = await firstValueFrom(
        this.userService.login({ email, password }),
      );
      Logger.log(
        `User with email: ${email} successfully logged in. JWT token: ${loginResponse.token}`,
      );
    } catch (e) {
      Logger.error(`Error logging in user: ${e?.message}`);
    }
  }
}
