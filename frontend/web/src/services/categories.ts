import { api } from './apiClient';

export interface Category {
  id: number;
  name: string;
  icon?: string | null;
  color?: string | null;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>('/categories', { name });
  return data;
}

export async function updateCategory(categoryId: number, name: string): Promise<Category> {
  const { data } = await api.put<Category>(`/categories/${categoryId}`, { name });
  return data;
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await api.delete(`/categories/${categoryId}`);
}
