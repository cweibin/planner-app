import { api } from './apiClient';

export interface Role {
  id: number;
  name: string;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await api.get<Role[]>('/roles');
  return data;
}

export async function createRole(name: string): Promise<Role> {
  const { data } = await api.post<Role>('/roles', { name });
  return data;
}

export async function updateRole(roleId: number, name: string): Promise<Role> {
  const { data } = await api.put<Role>(`/roles/${roleId}`, { name });
  return data;
}

export async function deleteRole(roleId: number): Promise<void> {
  await api.delete(`/roles/${roleId}`);
}
