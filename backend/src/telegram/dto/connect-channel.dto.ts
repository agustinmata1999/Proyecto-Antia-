import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class ConnectByInviteLinkDto {
  @IsString()
  @IsNotEmpty({ message: 'El link de invitación es obligatorio' })
  inviteLink: string;
}

export class ConnectByNameDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del canal es obligatorio' })
  channelName: string;

  @IsOptional()
  @IsString()
  inviteLink?: string;
}

export class ConnectByIdDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del canal es obligatorio' })
  channelId: string;
}

export class VerifyChannelDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del canal es obligatorio' })
  channelId: string;
}

export class SearchByNameDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del canal es obligatorio' })
  channelName: string;
}
