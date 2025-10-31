import {
  DefaultEventTypes,
  TenantProvisioningSuccessHandler,
} from '@arc-saas/orchestrator-service';
import {injectable, BindingScope, Provider} from '@loopback/core';
import {AnyObject} from '@loopback/repository';
import {EventBridgeClient, PutEventsCommand} from '@aws-sdk/client-eventbridge';
import {consumer, IConsumer, QueueType} from 'loopback4-message-bus-connector';

@injectable({scope: BindingScope.TRANSIENT})
@consumer
export class TenantProvisioningSuccessHandlerConsumerProvider
  implements IConsumer<AnyObject, string>
{
  event: DefaultEventTypes.TENANT_PROVISIONING_SUCCESS =
    DefaultEventTypes.TENANT_PROVISIONING_SUCCESS;
  queue: QueueType = QueueType.EventBridge;
  constructor() {}

  async handle(detail: AnyObject): Promise<void> {
    console.log('Provisioning Success Handler Detail Received:', detail);

    const eventBridgeClient = new EventBridgeClient({
      region: process.env.EVENT_BUS_AWS_REGION,
    });

    const eventDetail = {...detail};

    const params = {
      Entries: [
        {
          Source: 'saas.tenant.provisioning.success.handler',
          DetailType: DefaultEventTypes.TENANT_DEPLOYMENT,
          Detail: JSON.stringify(eventDetail),
          EventBusName: process.env.EVENT_BUS_NAME || 'default',
          Time: new Date(),
        },
      ],
    };

    try {
      const command = new PutEventsCommand(params);
      const response = await eventBridgeClient.send(command);
      console.log('Tenant Deployment event sent successfully:', response);
    } catch (error) {
      console.error('Failed to send the tenant deployment event:', error);
      throw error;
    }
  }
}
