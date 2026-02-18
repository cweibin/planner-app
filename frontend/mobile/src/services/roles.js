import { request } from './api';

export async function fetchRoles() {
  return request({ path: '/roles' });
}

export async function createRole(name) {
  return request({
    path: '/roles',
    method: 'POST',
    data: { name },
  });
}

export async function updateRole(roleId, name) {
  return request({
    path: `/roles/${roleId}`,
    method: 'PUT',
    data: { name },
  });
}

export async function deleteRole(roleId) {
  return request({
    path: `/roles/${roleId}`,
    method: 'DELETE',
  });
}
