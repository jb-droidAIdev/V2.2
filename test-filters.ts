import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DashboardService } from './src/modules/dashboard/dashboard.service';
import { UsersService } from './src/modules/users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dashboardService = app.get(DashboardService);
  const usersService = app.get(UsersService);

  const admin = await usersService.findOne('admin@example.com');
  // @ts-ignore
  const userPayload = { ...admin, role: admin?.role, id: admin?.id, roleName: admin?.role }; 

  const filters = await dashboardService.getFilterOptions(userPayload, {});
  console.log('Returned campaigns from filter options:', filters.campaigns);

  await app.close();
}

bootstrap();
