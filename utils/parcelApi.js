// parcelApi.js 移植web端API字段
import { request } from './request.js';

export function queryComingParcel({ packageNo = '', receiverId, page = 1, pageSize = 20 }) {
  return request({
    url: '/parcels',
    method: 'GET',
    data: {
      packageNo,
      status: 1, // InDelivery
      receiverId,
      page,
      pageSize
    }
  });
}

export function queryLeavingParcel({ packageNo = '', senderId, page = 1, pageSize = 20 }) {
  return request({
    url: '/parcels',
    method: 'GET',
    data: {
      packageNo,
      status: 0, // Leaving
      senderId,
      page,
      pageSize
    }
  });
}
