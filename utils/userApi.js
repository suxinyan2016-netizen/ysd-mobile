// userApi.js
import { request } from './request.js';

export function queryUserInfo(userId) {
  return request({
    url: `/users/${userId}`,
    method: 'GET'
  });
}
