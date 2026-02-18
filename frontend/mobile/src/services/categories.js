import { request } from './api';

export async function fetchCategories() {
  return request({ path: '/categories' });
}

export async function createCategory(payload) {
  return request({
    path: '/categories',
    method: 'POST',
    data: payload,
  });
}

export async function updateCategory(categoryId, payload) {
  return request({
    path: `/categories/${categoryId}`,
    method: 'PUT',
    data: payload,
  });
}

export async function deleteCategory(categoryId) {
  return request({
    path: `/categories/${categoryId}`,
    method: 'DELETE',
  });
}
