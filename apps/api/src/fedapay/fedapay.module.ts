import { Module } from "@nestjs/common"

import { FedapayService } from "./fedapay.service"

@Module({
  providers: [FedapayService],
  exports: [FedapayService],
})
export class FedapayModule {}
