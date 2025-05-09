import {inject, Provider} from '@loopback/context';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import { UserRepository, UserCredentialsRepository, SignUpBindings, KeyCloakSignUpFn, VerifyBindings, KeyCloakPreVerifyFn, KeyCloakPostVerifyFn, AuthUser } from '@sourceloop/authentication-service';
import {
  AuthErrorKeys,
  IAuthUser,
  Keycloak,
  VerifyFunction,
} from 'loopback4-authentication';

export class KeycloakVerifyProvider
  implements Provider<VerifyFunction.KeycloakAuthFn>
{
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @repository(UserCredentialsRepository)
    public userCredsRepository: UserCredentialsRepository,
    @inject(SignUpBindings.KEYCLOAK_SIGN_UP_PROVIDER)
    private readonly signupProvider: KeyCloakSignUpFn,
    @inject(VerifyBindings.KEYCLOAK_PRE_VERIFY_PROVIDER)
    private readonly preVerifyProvider: KeyCloakPreVerifyFn,
    @inject(VerifyBindings.KEYCLOAK_POST_VERIFY_PROVIDER)
    private readonly postVerifyProvider: KeyCloakPostVerifyFn,
  ) {}

  value(): VerifyFunction.KeycloakAuthFn {
    return async (
      accessToken: string,
      refreshToken: string,
      profile: Keycloak.Profile,
    ) => {
      let user: IAuthUser | null = await this.userRepository.findOne({
        where: {
          email: profile.email,
        },
      });
      user = await this.preVerifyProvider(
        accessToken,
        refreshToken,
        profile,
        user,
      );
      if (!user) {
        throw new HttpErrors.BadRequest('User Not Found');
      }
      const creds = await this.userCredsRepository.findOne({
        where: {
          userId: user.id as string,
        },
      });
      if (
        !creds ||
        creds.authProvider !== 'keycloak' ||
        (creds.authId !== profile.keycloakId &&
          creds.authId !== profile.username)
      ) {
        throw new HttpErrors.Unauthorized(AuthErrorKeys.InvalidCredentials);
      }

      const authUser: AuthUser = new AuthUser({
        ...user,
        id: user.id as string,
      });
      authUser.permissions = [];
      authUser.externalAuthToken = accessToken;
      authUser.externalRefreshToken = refreshToken;
      return this.postVerifyProvider(profile, authUser);
    };
  }
}