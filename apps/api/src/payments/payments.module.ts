import { Module } from "@nestjs/common"

import { DossiersModule } from "../dossiers/dossiers.module"
import { PaymentsController } from "./payments.controller"

@Module({
  imports: [DossiersModule],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
