import { api } from '../fixtures/emptyApi';
function transformPetResponse(pet: Pet) {
  if (pet.birthDate !== null) pet.birthDate = new Date(pet.birthDate);
}
function transformOrderResponse(order: Order) {
  order.shipDate = new Date(order.shipDate);
  if (order.pets !== null)
    for (const child of order.pets) {
      if (child !== undefined) transformPetResponse(child);
    }
  if (order.invoice !== undefined) transformInvoiceResponse(order.invoice);
}
function transformInvoiceResponse(invoice: Invoice) {
  if (invoice.order !== undefined) transformOrderResponse(invoice.order);
}
function transformUserResponse(user: User) {
  for (const child of user.orders) {
    if (child !== undefined) transformOrderResponse(child);
  }
}
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    updatePet: build.mutation<UpdatePetApiResponse, UpdatePetApiArg>({
      query: (queryArg) => ({ url: `/pet`, method: 'PUT', body: queryArg.pet }),
      transformResponse: (response: UpdatePetApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformPetResponse(response);
        return response;
      },
    }),
    addPet: build.mutation<AddPetApiResponse, AddPetApiArg>({
      query: (queryArg) => ({ url: `/pet`, method: 'POST', body: queryArg.pet }),
      transformResponse: (response: AddPetApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformPetResponse(response);
        return response;
      },
    }),
    findPetsByStatus: build.query<FindPetsByStatusApiResponse, FindPetsByStatusApiArg>({
      query: (queryArg) => ({
        url: `/pet/findByStatus`,
        params: {
          status: queryArg.status,
        },
      }),
      transformResponse: (response: FindPetsByStatusApiResponse) => {
        if (!response) return response;
        for (const child of response) {
          if (child !== undefined) transformPetResponse(child);
        }
        return response;
      },
    }),
    findPetsByTags: build.query<FindPetsByTagsApiResponse, FindPetsByTagsApiArg>({
      query: (queryArg) => ({
        url: `/pet/findByTags`,
        params: {
          tags: queryArg.tags,
        },
      }),
      transformResponse: (response: FindPetsByTagsApiResponse) => {
        if (!response) return response;
        for (const child of response) {
          if (child !== undefined) transformPetResponse(child);
        }
        return response;
      },
    }),
    getPetById: build.query<GetPetByIdApiResponse, GetPetByIdApiArg>({
      query: (queryArg) => ({ url: `/pet/${queryArg.petId}` }),
      transformResponse: (response: GetPetByIdApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformPetResponse(response);
        return response;
      },
    }),
    updatePetWithForm: build.mutation<UpdatePetWithFormApiResponse, UpdatePetWithFormApiArg>({
      query: (queryArg) => ({
        url: `/pet/${queryArg.petId}`,
        method: 'POST',
        params: {
          name: queryArg.name,
          status: queryArg.status,
        },
      }),
      transformResponse: (response: UpdatePetWithFormApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformPetResponse(response);
        return response;
      },
    }),
    deletePet: build.mutation<DeletePetApiResponse, DeletePetApiArg>({
      query: (queryArg) => ({
        url: `/pet/${queryArg.petId}`,
        method: 'DELETE',
        headers: {
          api_key: queryArg.apiKey,
        },
      }),
    }),
    uploadFile: build.mutation<UploadFileApiResponse, UploadFileApiArg>({
      query: (queryArg) => ({
        url: `/pet/${queryArg.petId}/uploadImage`,
        method: 'POST',
        body: queryArg.body,
        params: {
          additionalMetadata: queryArg.additionalMetadata,
        },
      }),
    }),
    getInventory: build.query<GetInventoryApiResponse, GetInventoryApiArg>({
      query: () => ({ url: `/store/inventory` }),
    }),
    placeOrder: build.mutation<PlaceOrderApiResponse, PlaceOrderApiArg>({
      query: (queryArg) => ({ url: `/store/order`, method: 'POST', body: queryArg.order }),
      transformResponse: (response: PlaceOrderApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformOrderResponse(response);
        return response;
      },
    }),
    getOrderById: build.query<GetOrderByIdApiResponse, GetOrderByIdApiArg>({
      query: (queryArg) => ({ url: `/store/order/${queryArg.orderId}` }),
      transformResponse: (response: GetOrderByIdApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformOrderResponse(response);
        return response;
      },
    }),
    deleteOrder: build.mutation<DeleteOrderApiResponse, DeleteOrderApiArg>({
      query: (queryArg) => ({ url: `/store/order/${queryArg.orderId}`, method: 'DELETE' }),
    }),
    createUser: build.mutation<CreateUserApiResponse, CreateUserApiArg>({
      query: (queryArg) => ({ url: `/user`, method: 'POST', body: queryArg.user }),
      transformResponse: (response: CreateUserApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformUserResponse(response);
        return response;
      },
    }),
    createUsersWithListInput: build.mutation<CreateUsersWithListInputApiResponse, CreateUsersWithListInputApiArg>({
      query: (queryArg) => ({ url: `/user/createWithList`, method: 'POST', body: queryArg.body }),
      transformResponse: (response: CreateUsersWithListInputApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformUserResponse(response);
        return response;
      },
    }),
    loginUser: build.query<LoginUserApiResponse, LoginUserApiArg>({
      query: (queryArg) => ({
        url: `/user/login`,
        params: {
          username: queryArg.username,
          password: queryArg.password,
        },
      }),
    }),
    logoutUser: build.query<LogoutUserApiResponse, LogoutUserApiArg>({
      query: () => ({ url: `/user/logout` }),
    }),
    getUserByName: build.query<GetUserByNameApiResponse, GetUserByNameApiArg>({
      query: (queryArg) => ({ url: `/user/${queryArg.username}` }),
      transformResponse: (response: GetUserByNameApiResponse) => {
        if (!response) return response;
        if (response !== undefined) transformUserResponse(response);
        return response;
      },
    }),
    updateUser: build.mutation<UpdateUserApiResponse, UpdateUserApiArg>({
      query: (queryArg) => ({ url: `/user/${queryArg.username}`, method: 'PUT', body: queryArg.user }),
    }),
    deleteUser: build.mutation<DeleteUserApiResponse, DeleteUserApiArg>({
      query: (queryArg) => ({ url: `/user/${queryArg.username}`, method: 'DELETE' }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as enhancedApi };
export type UpdatePetApiResponse = /** status 200 Successful operation */ Pet;
export type UpdatePetApiArg = {
  /** Update an existent pet in the store */
  pet: Pet;
};
export type AddPetApiResponse = /** status 200 Successful operation */ Pet;
export type AddPetApiArg = {
  /** Create a new pet in the store */
  pet: Pet;
};
export type FindPetsByStatusApiResponse = /** status 200 successful operation */ Pet[];
export type FindPetsByStatusApiArg = {
  /** Status values that need to be considered for filter */
  status?: 'available' | 'pending' | 'sold';
};
export type FindPetsByTagsApiResponse = /** status 200 successful operation */ Pet[];
export type FindPetsByTagsApiArg = {
  /** Tags to filter by */
  tags?: string[];
};
export type GetPetByIdApiResponse = /** status 200 successful operation */ Pet;
export type GetPetByIdApiArg = {
  /** ID of pet to return */
  petId: number;
};
export type UpdatePetWithFormApiResponse = /** status 200 successful operation */ Pet;
export type UpdatePetWithFormApiArg = {
  /** ID of pet that needs to be updated */
  petId: number;
  /** Name of pet that needs to be updated */
  name?: string;
  /** Status of pet that needs to be updated */
  status?: string;
};
export type DeletePetApiResponse = unknown;
export type DeletePetApiArg = {
  apiKey?: string;
  /** Pet id to delete */
  petId: number;
};
export type UploadFileApiResponse = /** status 200 successful operation */ ApiResponse;
export type UploadFileApiArg = {
  /** ID of pet to update */
  petId: number;
  /** Additional Metadata */
  additionalMetadata?: string;
  body: Blob;
};
export type GetInventoryApiResponse = /** status 200 successful operation */ {
  [key: string]: number;
};
export type GetInventoryApiArg = void;
export type PlaceOrderApiResponse = /** status 200 successful operation */ Order;
export type PlaceOrderApiArg = {
  order: Order;
};
export type GetOrderByIdApiResponse = /** status 200 successful operation */ Order;
export type GetOrderByIdApiArg = {
  /** ID of order that needs to be fetched */
  orderId: number;
};
export type DeleteOrderApiResponse = unknown;
export type DeleteOrderApiArg = {
  /** ID of the order that needs to be deleted */
  orderId: number;
};
export type CreateUserApiResponse = /** status 200 successful operation */ User;
export type CreateUserApiArg = {
  /** Created user object */
  user: User;
};
export type CreateUsersWithListInputApiResponse = /** status 200 Successful operation */ User;
export type CreateUsersWithListInputApiArg = {
  body: User[];
};
export type LoginUserApiResponse = /** status 200 successful operation */ string;
export type LoginUserApiArg = {
  /** The user name for login */
  username?: string;
  /** The password for login in clear text */
  password?: string;
};
export type LogoutUserApiResponse = unknown;
export type LogoutUserApiArg = void;
export type GetUserByNameApiResponse = /** status 200 successful operation */ User;
export type GetUserByNameApiArg = {
  /** The name that needs to be fetched. Use user1 for testing */
  username: string;
};
export type UpdateUserApiResponse = unknown;
export type UpdateUserApiArg = {
  /** name that need to be deleted */
  username: string;
  /** Update an existent user in the store */
  user: User;
};
export type DeleteUserApiResponse = unknown;
export type DeleteUserApiArg = {
  /** The name that needs to be deleted */
  username: string;
};
export type Category = {
  id: number;
  name: string;
};
export type Tag = {
  id: number;
  name: string;
};
export type Pet = {
  id: number;
  name: string;
  category: Category;
  photoUrls: string[];
  tags: Tag[];
  /** pet status in the store */
  status: 'available' | 'pending' | 'sold';
  birthDate: Date | null;
};
export type Error = {
  code: string;
  message: string;
};
export type ApiResponse = {
  code: number;
  type: string;
  message: string;
};
export type Invoice = {
  id: number;
  value: number;
  order: Order;
};
export type Order = {
  id: number;
  petId: number;
  quantity: number;
  shipDate: Date;
  /** Order Status */
  status: 'placed' | 'approved' | 'delivered';
  complete: boolean;
  pets: Pet[] | null;
  invoice: Invoice;
};
export type User = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  /** User Status */
  userStatus: number;
  orders: Order[];
};
