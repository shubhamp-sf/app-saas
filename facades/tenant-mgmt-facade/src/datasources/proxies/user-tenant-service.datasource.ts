import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';
import {CONTENT_TYPE} from '@sourceloop/core';

const tokenKey = '{token}';
const config = {
  name: 'UserTenantService',
  connector: 'rest',
  baseUrl: process.env.USER_TENANT_SERVICE_URL as string,
  crud: true,
  options: {
    baseUrl: process.env.USER_TENANT_SERVICE_URL as string,
    headers: {
      accept: CONTENT_TYPE.JSON,
      ['content-type']: CONTENT_TYPE.JSON,
    },
  },
  operations: [
    {
      template: {
        method: 'POST',
        url: '/create-user',
        headers: {
          Authorization: '{token}',
        },
        body: '{body}',
      },
      functions: {
        configureIdpDetails: [ 'body', 'token'],
      },
    },
    {
      template: {
        method: 'POST',
        url: '/tenants/{id}/users',
        headers: {
          Authorization: '{token}',
        },
        body: '{body}',
      },
      functions: {
        createTenantUser: ['id', 'body', 'token'],
      },
    },
    {
      template: {
        method: 'DELETE',
        url: `/tenants/{id}/users/{userId}`,
        headers: {
          Authorization: '{token}',
        },
      },
      functions: {
        deleteTenantUserById: ['id', 'userId', 'token'],
      },
    },
    {
      template: {
        method: 'GET',
        url: '/tenants/{id}/users',
        headers: {
          Authorization: tokenKey,
        },
        query: {
          filter: '{filter}',
        },
        options: {
          useQuerystring: true,
        },
      },
      functions: {
        findTenantUser: ['id', 'token', 'filter'],
      },
    },
  ],
};

@lifeCycleObserver('datasource')
export class UserTenantServiceDataSource
  extends juggler.DataSource
  implements LifeCycleObserver
{
  static dataSourceName = 'UserTenantService';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.UserTenantService', {optional: true})
    dsConfig: object = config,
  ) {
    const dsConfigJson = {
      ...dsConfig,
      options: {
        baseUrl: process.env.USER_SERVICE_URL,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
      },
    };
    super(dsConfigJson);
  }
}
