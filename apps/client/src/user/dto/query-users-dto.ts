import { Type } from 'class-transformer';
import { IsIn, IsInt, Min } from 'class-validator';

export class QueryUsersDto {
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Page must be greater or equal to 0' })
  page: number = 0;

  @Type(() => Number)
  @IsIn([5, 10, 25], { message: 'Limit must be one of 5, 10, or 25' })
  limit: number = 10;
}
