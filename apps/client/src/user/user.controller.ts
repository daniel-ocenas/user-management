import type { UserLoginRequest, UserRegisterRequest } from '@app/common';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryUsersDto } from 'apps/client/src/user/dto/query-users-dto';
import { UserService } from 'apps/client/src/user/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Post('register')
  create(@Body() createUserDto: UserRegisterRequest) {
    try {
      return this.usersService.register(createUserDto);
    } catch (e) {
      console.log(e);
    }
  }

  @Post('login')
  login(@Body() request: UserLoginRequest) {
    return this.usersService.login(request);
  }

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Get(':id')
  userDetail(@Param('id') id: string) {
    return this.usersService.userDetail(id);
  }

  @Get()
  async queryUsers(@Query() query: QueryUsersDto) {
    const { page, limit } = query;
    return this.usersService.queryUsers(page, limit);
  }
}
