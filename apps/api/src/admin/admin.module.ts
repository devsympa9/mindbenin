import { Module } from "@nestjs/common"

import { DossiersModule } from "../dossiers/dossiers.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { AdminController } from "./admin.controller"
import { AdminService } from "./admin.service"

@Module({
  imports: [DossiersModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
