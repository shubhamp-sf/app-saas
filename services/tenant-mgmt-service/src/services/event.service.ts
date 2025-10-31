import {injectable, BindingScope} from '@loopback/core';
import {
  EventTypes,
  SubscriptionDTO,
  TenantWithRelations,
} from '@sourceloop/ctrl-plane-tenant-management-service';
import {AnyObject} from '@loopback/repository';
import {IEventConnector} from '@sourceloop/ctrl-plane-tenant-management-service';
import { Producer, producer, QueueType } from 'loopback4-message-bus-connector';

export enum Builder {
  CODE_BUILD = 'CODE_BUILD',
  JENKINS = 'JENKINS',
}

type EventBodyType = {
  type: EventTypes;
  tenant: Partial<TenantWithRelations>;
  subscription: SubscriptionDTO;
  secret: string;
  context: string;
} & AnyObject;

@injectable({scope: BindingScope.TRANSIENT})
export class EventConnector implements IEventConnector<EventBodyType> {
  constructor(
    @producer(QueueType.EventBridge)
    private eventBridgeProducer: Producer,
  ) {}

  async publish(eventBody: EventBodyType) {
    console.log('Event body received in the event connector:', eventBody);
    const {type, secret, context, ...data} = eventBody;

    const extraPlanConfig: AnyObject = {};

    if (data.subscription.plan?.sizeConfig) {
      for (const key in data.subscription.plan?.sizeConfig) {
        extraPlanConfig[key] = data.subscription.plan?.sizeConfig[key];
      }
    }
    const fieldsToRemove = [
      'deleted',
      'deletedOn',
      'modifiedOn',
      'deletedBy',
      'createdBy',
      'createdOn',
      'modifiedBy',
    ];
    data.tenant = this.removeFields(data.tenant, fieldsToRemove);

    // Define the event payload
    const eventPayload = {
      Entries: [
        {
          Source: 'TenantManagementService',
          DetailType: type,
          Detail: JSON.stringify({
            tenant: data.tenant,
            appConfig: data?.appConfig,
            planConfig: data.subscription.plan,
            builderConfig: {
              type: Builder.CODE_BUILD,
              config: {
                environmentOverride: {
                  ...extraPlanConfig,
                  tenant: JSON.stringify(data.tenant),
                  secret: secret,
                  context: context,
                },
              },
            },
          }),
          EventBusName: process.env.EVENT_BUS_NAME,
        },
      ],
    };
    await this.eventBridgeProducer.send(eventPayload);
  }

  private removeFields(obj: AnyObject, fieldsToRemove: string[]): AnyObject {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeFields(item, fieldsToRemove));
    } else if (typeof obj === 'object' && obj !== null) {
      const newObj: AnyObject = {};
      for (const key in obj) {
        if (!fieldsToRemove.includes(key)) {
          newObj[key] = this.removeFields(obj[key], fieldsToRemove);
        }
      }
      return newObj;
    }
    return obj;
  }
}
