import { Module } from "@nestjs/common"

import { FedapayModule } from "../fedapay/fedapay.module"
import { DossiersController } from "./dossiers.controller"
import { DossiersService } from "./dossiers.service"

@Module({
  imports: [FedapayModule],
  controllers: [DossiersController],
  providers: [DossiersService],
  exports: [DossiersService],
})
export class DossiersModule {}
