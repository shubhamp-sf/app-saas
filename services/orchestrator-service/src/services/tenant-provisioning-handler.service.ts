import {
  injectable,
  BindingScope,
  Provider,
  inject,
  service,
} from '@loopback/core';
import {AnyObject} from '@loopback/repository';
import {
  BuilderService,
  TenantProvisioningHandler,
  TierDetailsFn,
  OrchestratorServiceBindings,
  DefaultEventTypes,
} from '@arc-saas/orchestrator-service';
import {DataStoreService} from './data-store.service';
import {consumer, IConsumer, QueueType} from 'loopback4-message-bus-connector';

export interface ProvisioningInputs {
  planConfig: AnyObject;
  builderConfig: AnyObject;
  tenant: {
    id: string;
    identityProvider: string;
    name: string;
    status: number;
    key: string;
    spocUserId: string | null;
    domains: string[];
    leadId: string | null;
    addressId: string;
    contacts: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      isPrimary: boolean;
      type: string | null;
      tenantId: string;
    }[];
    address: {
      id: string;
      address: string;
      city: string | null;
      state: string | null;
      zip: string;
      country: string;
    };
  };
}

@injectable({scope: BindingScope.TRANSIENT})
@consumer
export class TenantProvisioningHandlerConsumerProvider
  implements IConsumer<AnyObject, string>
{
  event: DefaultEventTypes.TENANT_PROVISIONING =
    DefaultEventTypes.TENANT_PROVISIONING;
  queue: QueueType = QueueType.EventBridge;
  constructor(
    @inject(OrchestratorServiceBindings.TIER_DETAILS_PROVIDER)
    private tierDetails: TierDetailsFn,
    @inject(OrchestratorServiceBindings.BUILDER_SERVICE)
    private builderService: BuilderService,

    @service(DataStoreService)
    private readonly dataStoreService: DataStoreService,
  ) {}

  async handle(body: ProvisioningInputs): Promise<void> {
    // Extract plan and builder information from the body
    const planConfig = body.planConfig;
    const builder = body.builderConfig;
    const tier = planConfig.tier;
    const tenant = body.tenant;
    let identityProvider;
    for (const feature of planConfig.features) {
      console.log('Feature:', feature.key);
      if (feature.key === 'IdP') {
        console.log('inside if IDP');
        console.log(
          'FeatureIDP:',
          feature.key,
          feature.value?.value,
          feature.defaultValue,
        );
        identityProvider = feature.value?.value ?? feature.defaultValue; //check featuresValue if overriden otherwise use default value
      }
    }
    body.tenant.identityProvider = identityProvider;
    builder.config.environmentOverride.tenant = JSON.stringify(body.tenant);

    console.log('Tenant:', body.tenant);
    console.log('---------------');
    console.log('BuilderConfig:', builder);
    await this.dataStoreService.storeDataInDynamoDB({
      tenantId: tenant.id,
      ...body,
    });

    try {
      // Fetch tier details based on the provided tier
      const {jobIdentifier, ...otherTierDetails} = await this.tierDetails(tier);
      const jobName = jobIdentifier;

      // Ensure Job name is present in the tier details
      if (!jobName) {
        throw new Error('Builder Job name not found in plan details');
      }

      // Check if the builder type is CODE_BUILD
      if (builder?.type === 'CODE_BUILD') {
        // Trigger CodeBuild with the necessary environments
        const codeBuildResponse = await this.builderService.startJob(jobName, {
          ...otherTierDetails,
          ...(builder?.config?.environmentOverride ?? {}),
        });

        console.log('Code Build Response: ', codeBuildResponse);

        return;
      } else {
        // Throw an error if the builder config is invalid
        throw Error('Invalid builder config provided.');
      }
    } catch (error) {
      console.error('Error in tenant provisioning:', error);
      return;
    }
  }
}
