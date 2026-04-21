import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CommandsController } from './commands.controller';
import { CommandsService } from './commands.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CommandsController],
  providers: [CommandsService],
})
export class CommandsModule {}
