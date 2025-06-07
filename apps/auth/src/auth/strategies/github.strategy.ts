import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('social.github.clientId'),
      clientSecret: configService.get<string>('social.github.clientSecret'),
      callbackURL: configService.get<string>('social.github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    
    const user = {
      provider: 'github',
      providerId: id,
      email: emails?.[0]?.value,
      username: username,
      firstName: displayName?.split(' ')[0],
      lastName: displayName?.split(' ').slice(1).join(' '),
      avatar: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
