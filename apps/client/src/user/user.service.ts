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
import { type ClientGrpc } from '@nestjs/microservices';
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
  private readonly logger = new Logger(UserService.name);
  private readonly pageRequest = new Subject<{
    page: number;
    limit: number;
  }>();

  async onModuleInit() {
    this.userService =
      this.client.getService<UserServiceClient>(USER_SERVICE_NAME);

    // UC 4.1 Load and register users from a file
    this.logger.debug('UC 4.1. Load and register users from a file');
    const users = this.loadUsersFromFile();
    await this.registerAllUsers(users);

    // US 4.2.1
    this.logger.debug('UC 4.2.1. Query users with pagination');
    await this.queryUsers(2, 5);
    // US 4.2.2
    this.logger.debug('UC 4.2.2. Query users with pagination');
    await this.queryUsers(2, 10);
    // US 4.2.3
    this.logger.debug('UC 4.2.3. Register a user that already exists');
    await this.implementUC423();
    // US 4.2.4
    this.logger.debug(
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
        this.logger.log(`Requesting users for page=${page}, limit=${limit}`),
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
      this.logger.log(
        `Successfully loaded ${usersData.length} users from ${filePath}`,
      );
      return usersData;
    } catch (e) {
      if (e.code === 'ENOENT') {
        this.logger.warn(`File not found: ${filePath}. No users loaded.`);
      } else {
        this.logger.error(`Error loading users from ${filePath}: ${e.message}`);
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
      this.logger.log(`Registered user IDs: ${registeredIds.join(', ')}`);
    } else {
      this.logger.warn('No users registered.');
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
          this.logger.log(
            `Received ${response.users.length} users (page ${response.page}), Received user ids: ${receivedUserIds}`,
          );
          resolve(response);
          subscription.unsubscribe();
        },
        (error) => {
          this.logger.error(`Error querying users: ${error.details}`);
          resolve(error);
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
        this.logger.log(e);
        this.logger.warn('User already exists.');
      } else {
        this.logger.error(`Error registering user: ${e.message}`);
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
      this.logger.log(
        `User with email: ${email} successfully logged in. JWT token: ${loginResponse.token}`,
      );
    } catch (e) {
      this.logger.error(`Error logging in user: ${e?.message}`);
    }
  }
}
