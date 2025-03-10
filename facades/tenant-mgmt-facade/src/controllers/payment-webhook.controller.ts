import {inject, intercept, service} from '@loopback/core';
import {post, requestBody} from '@loopback/rest';
import {authorize} from 'loopback4-authorization';
import {PAYMENT_WEBHOOK_VERIFIER} from '../keys';
import {PermissionKey} from '../permissions';
import {BillingHelperService} from '../services/billing-helper.service';
import {
  SubscriptionProxyService,
  TenantMgmtProxyService,
} from '../services/proxies';
import {ISubscription} from '../types';

import {CryptoHelperService} from '@sourceloop/ctrl-plane-tenant-management-service';
export class WebhookPaymentController {
  constructor(
    @service(CryptoHelperService)
    private readonly cryptoHelperService: CryptoHelperService,
    @inject('services.SubscriptionProxyService')
    private readonly subscriptionProxyService: SubscriptionProxyService,
    @inject('services.BillingHelperService')
    private readonly billingHelperService: BillingHelperService,
    @inject('services.TenantMgmtProxyService')
    private readonly tenantMgmtProxyService: TenantMgmtProxyService,
  ) {}

  @authorize({
    permissions: ['*'],
  })
  @intercept(PAYMENT_WEBHOOK_VERIFIER)
  @post('/webhooks/payments')
  async handleWebhook(
    @requestBody({
      content: {
        'application/json': {
          'x-parser': 'raw',
        },
      },
    })
    payload: any,
  ): Promise<void> {
    // Convert the buffer payload to JSON
    const jsonString = payload.toString('utf-8');
    const parsedPayload = JSON.parse(jsonString);
    const event = parsedPayload.type;
    const content = parsedPayload.data.object;
    console.log('webhook inside controller, with payload,', parsedPayload);
    switch (event) {
      case 'invoice.paid':
        await this.handlePaymentSucceeded(content);
        break;

      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(content);
        break;
      // Handle other events here
      default:
        console.log(`Unhandled event type: ${event}`);
    }
  }

  private async handlePaymentSucceeded(content: any): Promise<void> {
    console.log('handle suceeed payment started');
    const customer = await this.billingHelperService.getCustomer({
      where: {customerId: content.customer},
      include: [
        {
          relation: 'invoices', // This includes related invoices
        },
      ],
    });
    console.log('get customer succedd customer=', customer);
    const token = this.cryptoHelperService.generateTempToken({
      id: customer.info.tenantId,
      userTenantId: customer.info.tenantId,
      permissions: [
        PermissionKey.ViewSubscription,
        PermissionKey.ViewPlan,
        PermissionKey.CreateSubscription,
        PermissionKey.CreateInvoice,
        '7029', // view plan sizes
        '7033', // view plan features
        '10216',
      ],
    });
    const subscription = await this.subscriptionProxyService.find(token, {
      where: {subscriberId: customer.info.tenantId},
      include: ['plan'],
    });
    console.log('subscription service succeed, subscription=', subscription);

    if (subscription.length === 0) throw new Error('Suscription not  found');

    const updatedSubscriptionDto = await this.addPlanDetails(
      subscription[0],
      token,
    );

    const sdto: ISubscription = {
      id: updatedSubscriptionDto.id,
      subscriberId: updatedSubscriptionDto.subscriberId,
      startDate: updatedSubscriptionDto.startDate,
      endDate: updatedSubscriptionDto.endDate,
      status: updatedSubscriptionDto.status,
      planId: updatedSubscriptionDto.planId,
      plan: updatedSubscriptionDto.plan,
      invoiceId: updatedSubscriptionDto.invoiceId,
    };
    console.log(
      ' provision started token= ',
      `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
    );

    console.log('Final Subscription DTO', sdto);

    await this.tenantMgmtProxyService.provisionTenant(
      `Bearer ${token.replace(/^Bearer\s+/i, '')}`,
      customer.info.tenantId,
      sdto,
    );
    console.log('provisioning successfull');
  }

  async addPlanDetails(subscriptionDto: ISubscription, token?: string) {
    console.log('adding plan details to:', subscriptionDto);
    if (subscriptionDto.plan?.size) {
      try {
        console.log('token for plan size config', token);

        const filter = {
          where: {size: subscriptionDto.plan.size},
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
          subscriptionDto.plan.sizeConfig = planSizeConfig[0].config;
        }
        console.log('planSizeConfig', planSizeConfig);
      } catch (err) {
        console.log('Failed to get the plan size config', err);
      }
    }

    if (subscriptionDto.plan) {
      try {
        const planFeatures =
          await this.subscriptionProxyService.getPlanFeatures(
            `Bearer ${token}`,
            subscriptionDto.plan?.id,
          );

        console.log('planFeatures', planFeatures);
        subscriptionDto.plan.features = planFeatures.features;
      } catch (err) {
        console.log('Failed to get the plan features:', err);
      }
    }
    return subscriptionDto;
  }
}
