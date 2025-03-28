import {
  RestBindings,
  Request,
  get,
  getModelSchemaRef,
  getFilterSchemaFor,
  param,
  del,
  post,
  requestBody,
  patch,
  getWhereSchemaFor,
} from '@loopback/rest';

import {inject} from '@loopback/context';
import {authenticate, STRATEGY} from 'loopback4-authentication';
import {authorize} from 'loopback4-authorization';

import {
  CONTENT_TYPE,
  ErrorCodes,
  OPERATION_SECURITY_SPEC,
  STATUS_CODE,
} from '@sourceloop/core';
import {AnyObject, Filter, Where} from '@loopback/repository';

import {
  TenantMgmtProxyService,
  UserTenantServiceProxy,
} from '../services/proxies';
import {PermissionKey} from '../enum/permission-key.enum';

import {UserView} from '../models/user-view.model';
import {UserDto} from '../models/user-dto.model';
import {User} from '../models/user.model';
import {IdpDetailsDTO} from '../models/idp-details-dto.model';
import {TenantHelperService} from '../services';
import {service} from '@loopback/core';
import { TenantUserService } from '../services/tenant-user.service';

const basePath = '/tenants/{id}/users';
export class TenantUserController {
  private readonly currentUserToken;
  constructor(
    @inject(RestBindings.Http.REQUEST)
    private readonly request: Request,
    @inject('services.TenantMgmtProxyService')
    private readonly tenantMgmtProxyService: TenantMgmtProxyService,
    @inject('services.UserTenantServiceProxy')
    private readonly utService: UserTenantServiceProxy,
    @service(TenantUserService)
    private readonly tenantUser: TenantUserService,
  ) {
    this.currentUserToken = this.request.headers.authorization;
  }

  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @authorize({
    permissions: [
      PermissionKey.ViewTenantUser,
      PermissionKey.ViewTenantUserNum,
    ],
  })
  @get(basePath, {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      ...ErrorCodes,
      [STATUS_CODE.OK]: {
        description: 'Array of Tenant has many Users',
        content: {
          [CONTENT_TYPE.JSON]: {
            schema: {type: 'array', items: getModelSchemaRef(User)},
          },
        },
      },
    },
  })
  async find(
    @param.path.string('id') id: string,
    @param.query.object('filter', getFilterSchemaFor(UserView))
    filter?: Filter<UserView>,
  ): Promise<UserView[]> {
    return this.utService.findTenantUser(
      id,
      this.currentUserToken,
      JSON.stringify(filter),
    );
  }

  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @authorize({
    permissions: [
      PermissionKey.ViewTenant,
      PermissionKey.CreateTenantUser,
      PermissionKey.CreateTenantUserNum,
    ],
  })
  @post(basePath, {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      ...ErrorCodes,
      [STATUS_CODE.OK]: {
        description: 'tenant user model instance',
        content: {
          [CONTENT_TYPE.JSON]: {schema:Object},
        },
      },
    },
  })
  async create(
    @param.path.string('id') id: string,
    @requestBody({
      [CONTENT_TYPE.JSON]: {
        schema: getModelSchemaRef(IdpDetailsDTO, {
          title: 'NewUserInTenant',
        }),
      },
    })
    userData: IdpDetailsDTO,
  ): Promise<AnyObject> {
    return this.tenantUser.createTenantUser(id,userData,this.currentUserToken);
  }

  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @authorize({
    permissions: [
      PermissionKey.DeleteTenantUser,
      PermissionKey.DeleteTenantUserNum,
    ],
  })
  @del(`${basePath}/{userId}`, {
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.NO_CONTENT]: {
        description: 'User DELETE success',
      },
    },
  })
  async deleteById(
    @param.path.string('id') id: string,
    @param.path.string('userId') userId: string,
  ): Promise<void> {
    return this.utService.deleteTenantUserById(
      id,
      userId,
      this.currentUserToken,
    );
  }

}
