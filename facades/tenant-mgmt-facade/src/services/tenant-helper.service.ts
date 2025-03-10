import {BindingScope, inject, injectable, service} from '@loopback/core';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';
import {ILogger, LOGGER} from '@sourceloop/core';
import moment, {unitOfTime} from 'moment';
import {NotificationType, SubscriptionStatus} from '../enum';
import {CreateTenantWithPlanDTO, Tenant, TenantOnboardDTO} from '../models';
import {PermissionKey} from '../permissions';
import {
  CustomerDtoType,
  IBillingCycle,
  PaymentSourceDtoType,
  SubscriptionProxyService,
  TenantMgmtProxyService,
} from './proxies';
import {
  CheckBillingSubscriptionsDTO,
  CreateTenantWithPaymentDTO,
} from '../models/dtos';
import {SubscriptionBillDTO} from '../models/dtos/subscription-bill-dto.model';
import {ISubscription} from '../types';
import {BillingHelperService} from './billing-helper.service';
import {NotificationService} from './notifications/notification.service';
import {CryptoHelperService} from '@sourceloop/ctrl-plane-tenant-management-service';
import {Filter} from '@loopback/repository';
import {TenantMgmtConfig} from '../models/dtos/tenant-mgmt-config.model';
const SECONDS_IN_ONE_HOUR = 60 * 60;
@injectable({scope: BindingScope.TRANSIENT})
export class TenantHelperService {
  constructor(
    @service(CryptoHelperService)
    private readonly cryptoHelperService: CryptoHelperService,
    @inject('services.SubscriptionProxyService')
    private readonly subscriptionProxyService: SubscriptionProxyService,
    @inject('services.TenantMgmtProxyService')
    private readonly tenantMgmtProxyService: TenantMgmtProxyService,
    @inject('services.BillingHelperService')
    private readonly billingHelperService: BillingHelperService,
    @service(NotificationService)
    private notificationService: NotificationService,
    @inject(LOGGER.LOGGER_INJECT)
    private readonly logger: ILogger,
    @inject(RestBindings.Http.REQUEST)
    private readonly request: Request,
  ) {}
  async createTenantConfig(dto: TenantMgmtConfig, token?: string) {
    const tokenValue = this.cryptoHelperService.generateTempToken(
      {
        userTenantId: dto.tenantId,
        permissions: [
          PermissionKey.CreateLead,
          PermissionKey.UpdateLead,
          PermissionKey.DeleteLead,
          PermissionKey.ViewLead,
          PermissionKey.CreateTenant,
          PermissionKey.ProvisionTenant,
          PermissionKey.UpdateTenant,
          PermissionKey.DeleteTenant,
          PermissionKey.ViewTenant,
          PermissionKey.CreateContact,
          PermissionKey.UpdateContact,
          PermissionKey.DeleteContact,
          PermissionKey.ViewContact,
          PermissionKey.CreateInvoice,
          PermissionKey.UpdateInvoice,
          PermissionKey.DeleteInvoice,
          PermissionKey.ViewInvoice,
          PermissionKey.CreateNotification,
          PermissionKey.CreateSubscription,
          PermissionKey.UpdateSubscription,
          PermissionKey.ViewSubscription,
          PermissionKey.ViewPlan,
          PermissionKey.ViewNotificationTemplate,
          PermissionKey.CreateNotificationTemplate,
          PermissionKey.UpdateNotificationTemplate,
          PermissionKey.DeleteNotificationTemplate,
          PermissionKey.CreateTenantConfig,
          PermissionKey.ViewTenantConfig,
        ],
      },
      SECONDS_IN_ONE_HOUR,
    );
    const tenantConfig = await this.tenantMgmtProxyService.createTenantConfig(
      `Bearer ${tokenValue}`,
      new TenantMgmtConfig(dto),
    );
    return tenantConfig;
  }
  async getTenantConfig(id: string, filter?: Filter<TenantMgmtConfig>) {
    const token = this.cryptoHelperService.generateTempToken(
      {
        userTenantId: id,
        permissions: [
          PermissionKey.CreateLead,
          PermissionKey.UpdateLead,
          PermissionKey.DeleteLead,
          PermissionKey.ViewLead,
          PermissionKey.CreateTenant,
          PermissionKey.ProvisionTenant,
          PermissionKey.UpdateTenant,
          PermissionKey.DeleteTenant,
          PermissionKey.ViewTenant,
          PermissionKey.CreateContact,
          PermissionKey.UpdateContact,
          PermissionKey.DeleteContact,
          PermissionKey.ViewContact,
          PermissionKey.CreateInvoice,
          PermissionKey.UpdateInvoice,
          PermissionKey.DeleteInvoice,
          PermissionKey.ViewInvoice,
          PermissionKey.CreateNotification,
          PermissionKey.CreateSubscription,
          PermissionKey.UpdateSubscription,
          PermissionKey.ViewSubscription,
          PermissionKey.ViewPlan,
          PermissionKey.ViewNotificationTemplate,
          PermissionKey.CreateNotificationTemplate,
          PermissionKey.UpdateNotificationTemplate,
          PermissionKey.DeleteNotificationTemplate,
          PermissionKey.CreateTenantConfig,
          PermissionKey.ViewTenantConfig,
        ],
      },
      SECONDS_IN_ONE_HOUR,
    );
    const tenantConfig = await this.tenantMgmtProxyService.getTenantConfig(
      `Bearer ${token}`,
    );
    return tenantConfig;
  }
  async createTenant(dto: CreateTenantWithPlanDTO,sourceOfOrigin:string, token?: string) {
    token = token ?? this.request.headers.authorization;
    if (!token) {
      throw new HttpErrors.Unauthorized(
        'Authorization header not present. [Create Tenant]',
      );
    }
    console.log('Dto for create tenant', dto);
    console.log('token', token.replace(/^Bearer\s+/i, ''));

    const selectedPlan = await this.subscriptionProxyService.findPlanById(
      token.replace(/^Bearer\s+/i, ''),
      dto.planId,
      {
        include: [
          {
            relation: 'currency',
          },
        ],
      },
    );
    console.log('step 1');
    if (!selectedPlan) {
      throw new Error('selected plan does not exist');
    }

    const tenant = await this.tenantMgmtProxyService.createTenant(
      `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
      new TenantOnboardDTO(dto),
    );

    if(sourceOfOrigin!=='market_place'){

          /**for market place we assume IdP will always be cognito
           * if we call the tenant config creation api make sure to add its permission
           * in the token
           */
          const config = new TenantMgmtConfig({
            configKey: 'auth0',
            configValue: {
              password: 'test123@123',
              connection: 'Username-Password-Authentication',
              display_name: 'corporatidonw',
              verify_email: true,
              page_background: '#000000',
              primary_color: '#0059d6',
            },
            tenantId: tenant.id,
          });

          await this.tenantMgmtProxyService.createTenantConfig(token, config);
          console.log('step 2');
    }else{
      // DO NOTHING
    }


    const customer: CustomerDtoType = {
      firstName: tenant.contacts[0].firstName,
      lastName: tenant.contacts[0].lastName,
      email: tenant.contacts[0].email,
      company: tenant.name,
      phone: 'NA',
      billingAddress: {
        firstName: tenant.contacts[0].firstName,
        lastName: tenant.contacts[0].lastName,
        email: tenant.contacts[0].email,
        company: tenant.name,
        city: dto.city ?? '',
        state: dto.state ?? '',
        zip: dto.zip ?? '',
        country: dto.country ?? '',
      },
    };
    const res = await this.billingHelperService.createCustomer(
      tenant.id,
      customer,
      token,
    );

    console.log('Customer Response', res);

    let invoiceChargeDescription = selectedPlan.description;
    if (!invoiceChargeDescription || invoiceChargeDescription === '') {
      invoiceChargeDescription = selectedPlan.name;
    }
    const invoice = await this.billingHelperService.createInvoice(
      {
        customerId: res.id ?? '',
        charges: [
          {
            amount: +selectedPlan.price * 100, // converting amount in cents
            description: invoiceChargeDescription,
          },
        ],
        shippingAddress: customer.billingAddress,
        options: {
          discounts: [],
          autoCollection: 'off',
        },
        currencyCode: selectedPlan.currency?.currencyCode ?? 'USD',
      },
      token,
    );

    console.log('step 3');

    await this._createSubscription(dto.planId, tenant.id, invoice.id);

    console.log('step 5');

    if (!invoice.id) {
      throw new Error(' invoice is not created ');
    }
    await this.billingHelperService.applyPaymentForInvoice(
      invoice.id,
      {
        paymentMethod: dto.paymentMethod,
        amount: invoice.charges.reduce(
          (total, charge) => total + charge.amount,
          0,
        ),
        date: Math.floor(new Date().getTime() / 1000),
        comment: dto.comment,
      },
      token,
    );
    return tenant;
  }
  async createTenantFromLead(
    token: string,
    id: string,
    dto: Omit<CreateTenantWithPaymentDTO, 'contact'>,
  ) {
    const token1 = this.cryptoHelperService.generateTempToken({
      id: id,
      userTenantId: id,
      permissions: [
        PermissionKey.ViewSubscription,
        PermissionKey.ViewPlan,
        PermissionKey.CreateSubscription,
        PermissionKey.CreateInvoice,
        PermissionKey.CreateTenant,
        '7029', // view plan sizes
        '7033', // view plan features
      ],
    });
    const selectedPlan = await this.subscriptionProxyService.findPlanById(
      token1,
      dto.planId,
      {
        include: [
          {
            relation: 'currency',
          },
        ],
      },
    );
    if (!selectedPlan || !process.env.GATEWAY_ACCOUNT_ID) {
      throw new Error('Something went wrong');
    }

    const tenant = await this.tenantMgmtProxyService.createTenantFromLead(
      token,
      id,
      new TenantOnboardDTO(dto),
    );
    const config = new TenantMgmtConfig({
      configKey: 'auth0',
      configValue: {
        password: 'test123@123',
        connection: 'Username-Password-Authentication',
        display_name: 'corporatidonw',
        verify_email: true,
        page_background: '#000000',
        primary_color: '#0059d6',
      },
      tenantId: tenant.id,
    });

    const tenantConfig = await this.tenantMgmtProxyService.createTenantConfig(
      token,
      config,
    );
    const customer: CustomerDtoType = {
      firstName: tenant.contacts[0].firstName,
      lastName: tenant.contacts[0].lastName,
      email: tenant.contacts[0].email,
      company: tenant.name,
      phone: 'NA',
      billingAddress: {
        firstName: tenant.contacts[0].firstName,
        lastName: tenant.contacts[0].lastName,
        email: tenant.contacts[0].email,
        company: tenant.name,
        city: tenant.address?.city ?? '',
        state: tenant.address?.state ?? '',
        zip: tenant.address?.zip ?? '',
        country: tenant.address?.country ?? '',
      },
    };
    const res = await this.billingHelperService.createCustomer(
      tenant.id,
      customer,
    );

    const invoice = await this.billingHelperService.createInvoice({
      customerId: res.id ?? '',
      charges: [
        {
          amount: +selectedPlan.price * 100, // amount in cents
          description: selectedPlan.description,
        },
      ],
      shippingAddress: customer.billingAddress,
      options: {
        discounts: [],
        autoCollection: 'off',
      },
      currencyCode: selectedPlan.currency?.currencyCode ?? 'USD',
    });
    const subscription = await this._createSubscription(
      dto.planId,
      tenant.id,
      invoice.id,
    );
    const sdto: ISubscription = {
      id: subscription.id,
      subscriberId: subscription.subscriberId,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      planId: subscription.planId,
      plan: subscription.plan,
      invoiceId: subscription.invoiceId,
    };
    if (!res.id) {
      throw new Error('customer is not created');
    }

    const paymentDetails: PaymentSourceDtoType = {
      customerId: res.id,
      options: {
        token: dto.paymentToken,
      },
    };
    const paymentSource =
      await this.billingHelperService.createPaymentSource(paymentDetails);
    if (!paymentSource.id || !invoice.id) {
      throw new Error(
        "either invoice is not created or user don't have payment source asscoiated with it",
      );
    }

    await this.billingHelperService.applyPaymentForInvoice(invoice.id, {
      paymentMethod: dto.paymentMethod,
      paymentSourceId: paymentSource.id,
    });
    return tenant;
  }

  async getTenantBills(userId: string): Promise<SubscriptionBillDTO[]> {
    const token = this.cryptoHelperService.generateTempToken({
      id: userId,
      userTenantId: userId,
      permissions: [
        PermissionKey.CreateLead,
        PermissionKey.UpdateLead,
        PermissionKey.DeleteLead,
        PermissionKey.ViewLead,
        PermissionKey.CreateTenant,
        PermissionKey.ProvisionTenant,
        PermissionKey.UpdateTenant,
        PermissionKey.DeleteTenant,
        PermissionKey.ViewTenant,
        PermissionKey.CreateContact,
        PermissionKey.UpdateContact,
        PermissionKey.DeleteContact,
        PermissionKey.ViewContact,
        PermissionKey.CreateInvoice,
        PermissionKey.UpdateInvoice,
        PermissionKey.DeleteInvoice,
        PermissionKey.ViewInvoice,
        PermissionKey.CreateNotification,
        PermissionKey.CreateSubscription,
        PermissionKey.UpdateSubscription,
        PermissionKey.ViewSubscription,
        PermissionKey.ViewPlan,
        PermissionKey.ViewNotificationTemplate,
        PermissionKey.CreateNotificationTemplate,
        PermissionKey.UpdateNotificationTemplate,
        PermissionKey.DeleteNotificationTemplate,
      ],
    });

    // const token = this.request.headers.authorization?? "";
    const subscriptionBills: SubscriptionBillDTO[] = [];

    const subscriptions = await this.subscriptionProxyService.find(token, {
      include: ['plan'],
    });
    for (const subscription of subscriptions) {
      const tenant = await this.tenantMgmtProxyService.getTenants(
        `Bearer ${token}`,
        {
          where: {id: subscription.subscriberId},
          include: ['lead', 'contacts'],
        },
      );
      const companyName = tenant[0].lead?.companyName ?? tenant[0].name;
      const firstName =
        tenant[0].lead?.firstName ?? tenant[0]?.contacts[0]?.firstName;
      const lastName =
        tenant[0].lead?.lastName ?? tenant[0]?.contacts[0]?.lastName;
      subscriptionBills.push(
        new SubscriptionBillDTO({
          companyName,
          userName: firstName + ' ' + lastName,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          planName: subscription.plan?.name,
        }),
      );
    }
    return subscriptionBills;
  }

  private async _createSubscription(
    planId: string,
    userId: string,
    invoiceId: string | undefined,
  ) {
    const token = this.cryptoHelperService.generateTempToken({
      id: userId,
      userTenantId: userId,
      permissions: [
        PermissionKey.ViewSubscription,
        PermissionKey.ViewPlan,
        PermissionKey.CreateSubscription,
        PermissionKey.CreateInvoice,
        '7029', // view plan sizes
        '7033', // view plan features
      ],
    });

    const plan = await this.subscriptionProxyService.findPlanById(
      token,
      planId,
      {
        include: ['billingCycle', 'currency'],
      },
    );

    if (!plan.billingCycle) {
      this.logger.error(`Billing cycle info missing for plan: ${planId}`);
      throw new HttpErrors.BadRequest('Invalid Plan');
    }

    if (!plan.currency) {
      this.logger.error(`Currency info missing for plan: ${planId}`);
      throw new HttpErrors.BadRequest('Invalid Plan');
    }

    const createdSubscription = await this.subscriptionProxyService.create(
      token,
      {
        planId,
        subscriberId: userId,
        status: SubscriptionStatus.ACTIVE,
        invoiceId: invoiceId ?? '',
      },
    );

    const subscriptionWithPlan = await this.subscriptionProxyService.findById(
      token,
      createdSubscription.id,
      JSON.stringify({
        include: [
          {
            relation: 'plan',
          },
        ],
      }),
    );

    if (subscriptionWithPlan.plan?.size) {
      try {
        console.log('token for plan size config', token);

        const filter = {
          where: {size: subscriptionWithPlan.plan.size},
        };

        console.log('filter', filter);

        const planSizeConfig =
          await this.subscriptionProxyService.getPlanSizeConfig(
            `Bearer ${token}`,
            filter,
          );
        if (
          planSizeConfig &&
          Array.isArray(planSizeConfig) &&
          planSizeConfig.length > 0
        ) {
          subscriptionWithPlan.plan.sizeConfig = planSizeConfig[0].config;
        }
        console.log('planSizeConfig', planSizeConfig);
      } catch (err) {
        console.log('Failed to get the plan size config', err);
      }
    }

    if (subscriptionWithPlan.plan) {
      try {
        const planFeatures =
          await this.subscriptionProxyService.getPlanFeatures(
            `Bearer ${token}`,
            subscriptionWithPlan.plan?.id,
          );

        console.log('planFeatures', planFeatures);
        subscriptionWithPlan.plan.features = planFeatures.features;
      } catch (err) {
        console.log('Failed to get the plan features:', err);
      }
    }

    return subscriptionWithPlan;
  }

  async checkBillingSubscriptions(
    userId: string,
    options?: CheckBillingSubscriptionsDTO,
  ) {
    const daysRemaining = 7;
    // fetch all subscriptions which need to be billed
    const token = this.cryptoHelperService.generateTempToken(
      {
        id: userId,
        userTenantId: userId,
        permissions: [
          PermissionKey.ViewSubscription,
          PermissionKey.ViewPlan,
          PermissionKey.ViewTenant,
          PermissionKey.CreateSubscription,
          PermissionKey.UpdateSubscription,
          PermissionKey.CreateNotification,
          PermissionKey.ViewNotificationTemplate,
        ],
      },
      SECONDS_IN_ONE_HOUR,
    );

    const subscriptions = await this.subscriptionProxyService.find(token, {
      where: {status: SubscriptionStatus.ACTIVE},
    });

    const expiredSubscriptionsArray = [];
    const expiringSoonSubscriptionObj = [];
    const subscriberIdTenantContactMap: {
      [key: string]: {name: string; email: string};
    } = {};

    const markSubscriptionsAsExpiredPromises = [];
    for (const subscription of subscriptions) {
      // check for if subscription is expired
      if (moment(subscription.endDate).isBefore(moment())) {
        expiredSubscriptionsArray.push({
          subscriptionId: subscription.id,
          subscriberId: subscription.subscriberId,
        });
        markSubscriptionsAsExpiredPromises.push(
          this.subscriptionProxyService.updateById(token, subscription.id, {
            status: SubscriptionStatus.EXPIRED,
          }),
        );
      }

      // check for if less then 7 days remaining and send notification
      if (
        moment(subscription.endDate).isBefore(
          moment().add(daysRemaining, 'days'),
        ) &&
        moment(subscription.endDate).isAfter(moment())
      ) {
        const daysRemainingToExpiry = moment(subscription.endDate).diff(
          moment(),
          'days',
        );
        expiringSoonSubscriptionObj.push({
          id: subscription.id,
          daysRemainingToExpiry,
          subscriberId: subscription.subscriberId,
        });
      }
    }

    await Promise.all(markSubscriptionsAsExpiredPromises);
    this.logger.info('Subscriptions marked as expired successfully');

    // Fetch all tenants which needs to be notified
    const tenants = await this.tenantMgmtProxyService.getTenants(
      `bearer ${token}`,
      {
        where: {
          id: {
            inq: expiredSubscriptionsArray
              .map(e => e.subscriberId)
              .concat(expiringSoonSubscriptionObj.map(e => e.subscriberId)),
          },
        },
        include: ['contacts'],
      },
    );

    const notificationPromises = [];

    for (const tenant of tenants) {
      subscriberIdTenantContactMap[tenant.id] = {
        name: tenant.contacts[0].firstName,
        email: tenant.contacts[0].email,
      };
    }

    for (const expiredSubscription of expiredSubscriptionsArray) {
      // notificationPromises.push(
      //   this.notificationService
      //     .send(            subscriberIdTenantContactMap[expiredSubscription.subscriberId].email,
      //     NotificationType.SubscriptionExpired,JSON.stringify(          {
      //       name: process.env.APP_NAME,
      //       user: subscriberIdTenantContactMap[
      //         expiredSubscription.subscriberId
      //       ].name,
      //       link: process.env.APP_NAME,
      //     }))
      //     .catch(e => this.logger.error(e)),
      // );
      notificationPromises.push(
        this.notificationService
          .send(
            subscriberIdTenantContactMap[expiredSubscription.subscriberId]
              .email,
            NotificationType.SubscriptionExpired,
            {
              name: process.env.APP_NAME,
              user: subscriberIdTenantContactMap[
                expiredSubscription.subscriberId
              ].name,
              link: process.env.APP_NAME,
            },
            token,
          )
          .catch(e => this.logger.error(e)),
      );
    }

    for (const expiringSoonSubscription of expiringSoonSubscriptionObj) {
      // notificationPromises.push(
      //   this.notificationService
      //     .send(
      //       subscriberIdTenantContactMap[expiringSoonSubscription.subscriberId].email,
      //       NotificationType.SubscriptionEndingSoon,JSON.stringify(
      //         {
      //           name: process.env.APP_NAME,
      //           user: subscriberIdTenantContactMap[
      //             expiringSoonSubscription.subscriberId
      //           ].name,
      //           remainingDays: expiringSoonSubscription.daysRemainingToExpiry,
      //         })
      //     )
      //     .catch(e => this.logger.error(e)),
      // );
      notificationPromises.push(
        this.notificationService
          .send(
            subscriberIdTenantContactMap[expiringSoonSubscription.subscriberId]
              .email,
            NotificationType.SubscriptionEndingSoon,
            {
              name: process.env.APP_NAME,
              user: subscriberIdTenantContactMap[
                expiringSoonSubscription.subscriberId
              ].name,
              remainingDays: expiringSoonSubscription.daysRemainingToExpiry,
            },
            token,
          )
          .catch(e => this.logger.error(e)),
      );
    }

    await Promise.all(notificationPromises);
    this.logger.info('Subscription notifications sent successfully');
  }

  private _unitMap(
    unit: IBillingCycle['durationUnit'],
  ): unitOfTime.DurationConstructor {
    switch (unit) {
      case 'month':
        return 'M';
      case 'year':
        return 'y';
      case 'week':
        return 'week';
      default:
        return 'days';
    }
  }
  async getAllTenants(userId: string, filter?: Filter<Tenant>) {
    const token = this.cryptoHelperService.generateTempToken(
      {
        id: userId,
        userTenantId: userId,
        permissions: [
          PermissionKey.CreateLead,
          PermissionKey.UpdateLead,
          PermissionKey.DeleteLead,
          PermissionKey.ViewLead,
          PermissionKey.CreateTenant,
          PermissionKey.ProvisionTenant,
          PermissionKey.UpdateTenant,
          PermissionKey.DeleteTenant,
          PermissionKey.ViewTenant,
          PermissionKey.CreateContact,
          PermissionKey.UpdateContact,
          PermissionKey.DeleteContact,
          PermissionKey.ViewContact,
          PermissionKey.CreateInvoice,
          PermissionKey.UpdateInvoice,
          PermissionKey.DeleteInvoice,
          PermissionKey.ViewInvoice,
          PermissionKey.CreateNotification,
          PermissionKey.CreateSubscription,
          PermissionKey.UpdateSubscription,
          PermissionKey.ViewSubscription,
          PermissionKey.ViewPlan,
          PermissionKey.ViewNotificationTemplate,
          PermissionKey.CreateNotificationTemplate,
          PermissionKey.UpdateNotificationTemplate,
          PermissionKey.DeleteNotificationTemplate,
        ],
      },
      5000,
    );

    // const token = this.request.headers.authorization?? "";
    const tenantDetails = [];

    const subscriptions = await this.subscriptionProxyService.find(token, {
      include: ['plan'],
    });

    for (const subscription of subscriptions) {
      const tenants = await this.tenantMgmtProxyService.getTenants(
        `Bearer ${token}`,
        {
          where: {id: subscription.subscriberId},
          include: ['contacts', 'address'],
        },
      );

      for (const tenant of tenants) {
        const contact = tenant.contacts[0];
        const tenantDetail = {
          ...tenant,
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          isPrimary: contact.isPrimary,
          type: contact.type,
          tenantId: contact.tenantId,
          contacts: undefined,
        };

        delete tenantDetail.contacts;
        const tenantWithSubscription = {
          ...tenantDetail,
          subscription,
        };
        tenantDetails.push(tenantWithSubscription);
      }
    }

    return tenantDetails;
  }
}
