import { Module } from "@nestjs/common"

import { FedapayModule } from "../fedapay/fedapay.module"
import { NotificationsModule } from "../notifications/notifications.module"
import { StorageModule } from "../storage/storage.module"
import { DocumentsService } from "./documents.service"
import { DossiersController } from "./dossiers.controller"
import { DossiersService } from "./dossiers.service"
import { DossiersStreamController } from "./dossiers-stream.controller"
import { PickupService } from "./pickup.service"

@Module({
  imports: [FedapayModule, NotificationsModule, StorageModule],
  controllers: [DossiersController, DossiersStreamController],
  providers: [DossiersService, DocumentsService, PickupService],
  exports: [DossiersService, DocumentsService, PickupService],
})
export class DossiersModule {}
