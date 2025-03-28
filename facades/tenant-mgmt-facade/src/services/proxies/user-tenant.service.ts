import {Filter, FilterExcludingWhere} from '@loopback/repository';
import {
 
} from '../../models';
import {inject, Provider} from '@loopback/context';
import {UserTenantServiceDataSource} from '../../datasources';
import {getService} from '@loopback/service-proxy';
import { UserView } from '../../models/user-view.model';
import { UserDto } from '../../models/user-dto.model';
import { User } from '../../models/user.model';
import { IdpDetailsDTO } from '../../models/idp-details-dto.model';
import { IdpResp } from '../../types';


export interface UserTenantServiceProxy {
  ping(): Promise<object>;

  findTenantUser(
    id: string,
    token?: string,
    filter?: string,
  ): Promise<UserView[]>;
  createTenantUser(id: string, body: Partial<UserDto>, token?: string): Promise<User>;

  deleteTenantUserById(
    id: string,
    userId: string,
    token?: string,
  ): Promise<void>;
  configureIdpDetails(payload: IdpDetailsDTO, token?: string): Promise<IdpResp>;
}

export class UserTenantServiceProxyProvider
  implements Provider<UserTenantServiceProxy>
{
  constructor(
    @inject('datasources.UserTenantService')
    protected dataSource: UserTenantServiceDataSource = new UserTenantServiceDataSource(),
  ) {}

  value(): Promise<UserTenantServiceProxy> {
    return getService(this.dataSource);
  }
}
