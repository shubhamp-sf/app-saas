import { BindingScope, inject, injectable } from "@loopback/context";
import { IdpDetailsDTO } from "../models/idp-details-dto.model";
import { UserTenantServiceProxy } from "./proxies";
import { UserDto } from "../models/user-dto.model";

@injectable({scope: BindingScope.TRANSIENT})
export class TenantUserService {
  constructor(
    @inject('services.UserTenantServiceProxy')
    private readonly utService: UserTenantServiceProxy
  ) {}
  async createTenantUser(id: string, userData: IdpDetailsDTO, token?: string) {
    const userDataPayload = {
      firstName: userData.firstName,
      middleName: userData.middleName,
      lastname: userData.last_name,
      username: userData.username,
      email: userData.email,
      designation: userData.designation,
      phone: userData.phone,
      authClientIds: userData.authClientIds,
      photoUrl: userData.photoUrl,
      gender: userData.gender,
      dob: userData.dob,
      roleId: userData.roleId,
      locale: userData.locale,
    } as Partial<UserDto>;
   const user= await this.utService.createTenantUser(id, userDataPayload, token);
    const authId = await this.utService.configureIdpDetails(userData, token);
    return {id: authId};
  }
}