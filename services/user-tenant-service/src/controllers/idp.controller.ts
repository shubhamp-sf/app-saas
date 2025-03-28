import {inject, intercept} from '@loopback/core';
import {getModelSchemaRef, post, requestBody} from '@loopback/rest';
import {
  CONTENT_TYPE,
  OPERATION_SECURITY_SPEC,
  rateLimitKeyGenPublic,
  STATUS_CODE,
} from '@sourceloop/core';
import {authorize} from 'loopback4-authorization';
import {ratelimit} from 'loopback4-ratelimiter';

import {ConfigureIdpFunc, IdPKey, IdpResp} from '../providers/types';
import {UserTenantServiceBindings} from '../keys';
import {IdpDetailsDTO} from '../models';
import {authenticate, STRATEGY} from 'loopback4-authentication';
import {UserCredentialsRepository} from '@sourceloop/user-tenant-service';
import {repository} from '@loopback/repository';

const basePath = '/create-user';
export class IdpController {
  constructor(
    @inject(UserTenantServiceBindings.IDP_KEYCLOAK)
    private readonly idpKeycloakProvider: ConfigureIdpFunc<IdpResp>,
    @repository(UserCredentialsRepository)
    protected userCredentialsRepository: UserCredentialsRepository,
  ) {}
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @authorize({
    permissions: ['*'],
  })
  @post(`${basePath}`, {
    description:'Configures a user for a specified identity provider (Keycloak or Cognito) and returns authentication details (authId and authSecret).',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.NO_CONTENT]: {
        description: 'Creating User',
      },
    },
  })
  async idpConfigure(
    @requestBody({
      content: {
        [CONTENT_TYPE.JSON]: {
          schema: getModelSchemaRef(IdpDetailsDTO, {
            title: 'IdpDetailsDTO',
          }),
        },
      },
    })
    payload: IdpDetailsDTO,
  ): Promise<IdpResp> {
    let res: IdpResp = {
      authId: '',
      authSecret: '',
    };
    switch (payload.tenant.identityProvider) {
      case IdPKey.COGNITO:
        return {
          authId: '',
          authSecret: '',
        };
      case IdPKey.KEYCLOAK: {
        const res = await this.idpKeycloakProvider(payload);
        await this.userCredentialsRepository.create({
          authProvider: 'keycloak',
          password: res.authSecret,
          userId: res.authId,
        });
        return res;
      }
      default:
        return {
          authId: '',
          authSecret: '',
        };
    }
  }
}
