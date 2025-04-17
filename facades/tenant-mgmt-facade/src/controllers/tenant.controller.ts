import {authorize} from 'loopback4-authorization';
import {
  AuthenticationBindings,
  STRATEGY,
  authenticate,
} from 'loopback4-authentication';
import {
  RoleRepository,
  UserTenantRepository,
  UserRepository,
} from '@sourceloop/authentication-service';
import {
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
} from '@loopback/openapi-v3';
import {inject, service} from '@loopback/core';
import {
  CONTENT_TYPE,
  OPERATION_SECURITY_SPEC,
  STATUS_CODE,
} from '@sourceloop/core';
import {PermissionKey} from '../permissions';
import {
  CreateTenantWithPlanDTO,
  Tenant,
  TenantRegistrationExternalDTO,
} from '../models';
import {TenantHelperService} from '../services';
import {
  CryptoHelperService,
  LeadUser,
} from '@sourceloop/ctrl-plane-tenant-management-service';

import {SubscriptionBillDTO} from '../models/dtos/subscription-bill-dto.model';
import {verifySignature} from '../utils';
import {HttpErrors} from '@loopback/rest';
import {PaymentMethodEnum, SubscriptionProxyService} from '../services/proxies';
import {Filter, repository} from '@loopback/repository';
import {AnyObject} from '@loopback/repository';

export class TenantController {
  constructor(
    @service(TenantHelperService)
    private readonly tenantHelper: TenantHelperService,

    @repository(RoleRepository)
    private readonly roleRepository: RoleRepository,
    @repository(UserTenantRepository)
    private readonly userTenantRepository: UserTenantRepository,
    @repository(UserRepository)
    private readonly userRepository: UserRepository,

    @inject('services.SubscriptionProxyService')
    private readonly subscriptionProxyService: SubscriptionProxyService,

    @service(CryptoHelperService)
    private readonly cryptoHelperService: CryptoHelperService,
  ) {}

  @authorize({
    permissions: [PermissionKey.CreateTenant],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @post(`/tenants`, {
    description:
      'This api creates a tenant with a contact, so it also expects contact info in the payload. The start of subscription is the time of creation of tenant and end date of plan depends on the duration of plan.',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'Tenant model instance',
        content: {
          [CONTENT_TYPE.JSON]: {schema: getModelSchemaRef(Tenant)},
        },
      },
    },
  })
  async onboard(
    @requestBody({
      content: {
        [CONTENT_TYPE.JSON]: {
          schema: getModelSchemaRef(CreateTenantWithPlanDTO, {
            title: 'CreateTenantDTO',
            exclude: [],
          }),
        },
      },
    })
    dto: CreateTenantWithPlanDTO,
  ): Promise<Tenant> {
    return this.tenantHelper.createTenant(dto,'control-plane-admin');
  }

  @authorize({
    permissions: ['*'],
  })
  @post(`/external/tenants`, {
    description:
      'This api to be consumed by external marketplaces creates a tenant with a contact, so it also expects contact info in the payload. The start of subscription is the time of creation of tenant and end date of plan depends on the duration of plan.',
    responses: {
      [STATUS_CODE.OK]: {
        description: 'Tenant model instance',
        content: {
          [CONTENT_TYPE.JSON]: {schema: getModelSchemaRef(Tenant)},
        },
      },
    },
  })
  async externalOnboarding(
    @requestBody({
      content: {
        [CONTENT_TYPE.JSON]: {
          schema: getModelSchemaRef(TenantRegistrationExternalDTO, {
            title: 'TenantRegistrationExternalDTO',
            exclude: [],
          }),
        },
      },
    })
    details: TenantRegistrationExternalDTO,
    @param.header.string('X-Signature') signature: string,
  ) {
    if (!details || !signature) {
      throw new HttpErrors.BadRequest('Missing payload or signature');
    }

    if (verifySignature(details, signature)) {
      console.log('Authenticated request:', details);

      const token = await this._getMarketplaceUserToken();

      const selectedPlanArr = await this.subscriptionProxyService
        .getPlans(token, {
          where: {
            name: details.plan.identifier,
          },
        })
        .catch(err => {
          console.error('Error fetching plans:', err);
        });

      if (!selectedPlanArr || selectedPlanArr.length < 1) {
        throw new HttpErrors.NotFound('Plan not found');
      }

      const selectedPlan = selectedPlanArr[0];

      console.log('selectedPlan:', selectedPlan);

      const tenantWithPlan = new CreateTenantWithPlanDTO({
        planId: selectedPlan.id,
        name: details.company.name,
        contact: {
          firstName: details.customer.firstName,
          lastName: details.customer.lastName,
          email: details.customer.email,
          isPrimary: true,
        },
        source: 'AWSMARKETPLACE',
        domains: [details.customer.email.split('@')[1]],
        key: details.appConfig.preferredSubdomain,
        address: details.customer.address,
        zip: details.customer.zip,
        country: details.customer.country,
        paymentMethod: PaymentMethodEnum.Other,
      });

      await this.tenantHelper.createTenant(tenantWithPlan, 'market_place',token);
      console.log('Provisioning started');
      return {
        message: 'Tenant created successfully',
      };
    } else {
      throw new HttpErrors.Unauthorized('Invalid signature');
    }
  }

  private async _getMarketplaceUserToken() {
    const marketplaceRole = await this.roleRepository.findOne({
      where: {
        name: 'Marketplace',
      },
    });
    if (!marketplaceRole) {
      throw new HttpErrors.NotFound('Marketplace role not found');
    }
    const marketplaceRoleId = marketplaceRole.id;
    console.log('marketplaceRoleId', marketplaceRoleId);
    const marketplaceUserTenant = await this.userTenantRepository.findOne({
      where: {
        roleId: marketplaceRoleId,
      },
    });
    if (!marketplaceUserTenant) {
      throw new HttpErrors.NotFound(
        'No user tenant entry with the marketplace role',
      );
    }
    console.log('marketplaceUserTenant', marketplaceUserTenant);
    const marketplaceUserId = marketplaceUserTenant.userId;
    console.log('marketplaceUserId', marketplaceUserId);
    const marketplaceUser = await this.userRepository.findOne({
      where: {
        id: marketplaceUserId,
      },
    });
    if (!marketplaceUser) {
      throw new HttpErrors.NotFound('Marketplace user not found');
    }

    const {...shortenedMarketplaceUser} = marketplaceUser;

    delete shortenedMarketplaceUser.deleted;
    delete shortenedMarketplaceUser.deletedBy;
    delete shortenedMarketplaceUser.deletedOn;
    delete shortenedMarketplaceUser.createdBy;
    delete shortenedMarketplaceUser.createdOn;
    delete shortenedMarketplaceUser.modifiedBy;
    delete shortenedMarketplaceUser.modifiedOn;

    const fifteenMinutesInSecs = 15 * 60;
    const token = this.cryptoHelperService.generateTempToken(
      {
        ...shortenedMarketplaceUser,
        permissions: marketplaceRole.permissions,
        role: marketplaceRole.name,
        tenantId: marketplaceUserTenant.tenantId,
        userTenantId: marketplaceUserTenant.id,
      },
      fifteenMinutesInSecs,
    );
    return token;
  }

  @authorize({
    permissions: [PermissionKey.ViewSubscription, PermissionKey.ViewTenant],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @get('tenant/Bills', {
    description:
      'This api verifies token sent to a lead to verify his identity',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'Array of Lead model instances',
        content: {
          [CONTENT_TYPE.JSON]: {
            schema: {
              type: 'array',
              items: getModelSchemaRef(SubscriptionBillDTO, {
                includeRelations: true,
              }),
            },
          },
        },
      },
    },
  })
  async findBill(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUser: LeadUser,
  ): Promise<SubscriptionBillDTO[]> {
    return this.tenantHelper.getTenantBills(currentUser.id);
  }
  // Get All Tenants
  @authorize({
    permissions: [PermissionKey.ViewTenant],
  })
  @authenticate(STRATEGY.BEARER, {
    passReqToCallback: true,
  })
  @get('/tenants', {
    description: 'Retrieve all tenants',
    security: OPERATION_SECURITY_SPEC,
    responses: {
      [STATUS_CODE.OK]: {
        description: 'Array of Tenant instances',
        content: {
          [CONTENT_TYPE.JSON]: {
            schema: {
              type: 'array',
              items: getModelSchemaRef(Tenant, {includeRelations: true}),
            },
          },
        },
      },
    },
  })
  async findTenants(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUser: LeadUser,
    @param.filter(Tenant) filter?: Filter<Tenant>,
  ): Promise<AnyObject> {
    return this.tenantHelper.getAllTenants(currentUser.id, filter);
  }
}
